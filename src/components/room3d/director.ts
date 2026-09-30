import { Group, Vector3, type AnimationClip, type Camera, type Mesh } from "three";
import { PetMood } from "@/lib/game/enums";
import { findMoment, momentLength, momentSentence, type Moment } from "@/lib/room/moments";
import type { HumanActor, HumanFrame } from "./human";
import { PET_SCALE, type PetActor } from "./pet";
import { makeProp, makeZ, type Prop } from "./props";
import { angleDelta, dampAngle } from "./rig";
import { BED } from "./set";

/**
 * Staging. The player keeps their spot on the left of the room and turns;
 * the pet does the walking. In between moments both are alive on their
 * own — the pet wanders by its mood, the player watches it. A moment is
 * two phases: getting into position, then its timeline from the registry
 * (clips, pet cues, a prop, a hand on the pet), and back to living.
 */

/**
 * Blocking. The player stands front-left and the pet lives back-right, on
 * a diagonal, so when the pet looks at the player its face turns to the
 * room, and the player reads in three-quarter or profile.
 */
export const HUMAN_HOME = new Vector3(-0.85, 0, 0.45);
const HUMAN_REST_YAW = 0.5;
const PET_HOME = new Vector3(0.6, 0, -0.2);
const AREA = { minX: -0.15, maxX: 1.9, minZ: -1.0, maxZ: 0.45 };
const DEG = Math.PI / 180;

/** Where the pet stands, in the player's space, for each formation. */
const SPOT = {
  front: new Vector3(-0.2, 0, 0.74),
  /** Side-on to a kneeling player, so its face is to the room. */
  frontSide: new Vector3(-0.12, 0, 0.66),
  /** Where the Treat clip offers the treat, and the Feed clip sets the bowl. */
  treat: new Vector3(-0.17, 0, 0.36),
  bowl: new Vector3(-0.2, 0, 0.38),
  beside: new Vector3(0.62, 0, 0.3),
  drop: new Vector3(0.28, 0, 0.82),
  /** Where a thrown ball first lands. */
  throw: new Vector3(0.1, 0, 1.9),
};

/** Where the pet steps back to, in room space from the player, to watch a free moment. */
const WATCH = new Vector3(1.1, 0, -0.45);

/**
 * How far from the camera's bearing the player's face may turn. Past it a
 * head reads as the back of a head, so a target behind is watched over the
 * shoulder, only as far as the face still shows.
 */
const FACE_LIMIT = 70 * Math.PI / 180;

const forward = (yaw: number) => new Vector3(Math.sin(yaw), 0, Math.cos(yaw));

export interface DirectorStatus {
  moment: string | null;
  sentence: string;
}

interface Run {
  moment: Moment;
  phase: "approach" | "perform";
  clock: number;
  t: number;
  length: number;
  fired: Set<string>;
  humanYaw: { from: number; to: number };
  petReady: boolean;
  prop: Prop | null;
  propState: "none" | "held" | "placed" | "flying" | "rest" | "carried" | "dropped";
  propScale: number;
  propGone: boolean;
  flight: { from: Vector3; to: Vector3; rest: Vector3; start: number } | null;
  anchor: Vector3 | null;
  bowlAt: Vector3 | null;
  fill: number;
  eating: boolean;
  /** Fetch: the pet has reached the ball and can pick it up once it stops. */
  atBall: boolean;
  /** Clips from the moment's own files are still on their way. */
  loading: boolean;
}

const smooth = (x: number) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};

function yawToward(from: Vector3, to: Vector3): number {
  return Math.atan2(to.x - from.x, to.z - from.z);
}

function toWorld(origin: Vector3, yaw: number, local: Vector3): Vector3 {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return new Vector3(origin.x + local.x * c + local.z * s, 0, origin.z - local.x * s + local.z * c);
}

function clampToArea(p: Vector3): Vector3 {
  return p.set(Math.min(AREA.maxX + 0.3, Math.max(-1.9, p.x)), 0, Math.min(1.3, Math.max(AREA.minZ, p.z)));
}

export class Director {
  human: HumanActor;
  private readonly pet: PetActor | null;
  private readonly camera: Camera;
  private readonly world: Group;
  private readonly name: string;
  private mood: PetMood | null;
  private onStatus: (status: DirectorStatus) => void = () => {};
  private readonly loadClips: (src: string) => Promise<AnimationClip[]>;
  /** Clips that arrived with an emote's own file; a new body gets them too. */
  private readonly extraClips: AnimationClip[] = [];
  reduced: boolean;

  private humanYaw = HUMAN_REST_YAW;
  private run: Run | null = null;
  private queued: string | null = null;
  private cooldown = 0;
  private clock = 0;
  // Life between moments.
  private gaze: "pet" | "camera" | "window" = "pet";
  private gazeUntil = 0;
  private petBusyUntil = 0;
  private petTrip = false;
  private napUntil = 0;
  private stillHold = 0;
  private greeted = false;
  private readonly zs: Array<{ mesh: Mesh; born: number; drift: number }> = [];
  private lastZ = 0;
  private readonly windowPoint: Vector3;
  /** Where the camera should look, and how close it should come (0–1). */
  readonly focus = new Vector3(0, 0.95, 0.1);
  zoom = 0;

  constructor(opts: {
    human: HumanActor;
    pet: PetActor | null;
    camera: Camera;
    world: Group;
    petName: string;
    mood: PetMood | null;
    reduced: boolean;
    windowPoint: Vector3;
    loadClips: (src: string) => Promise<AnimationClip[]>;
  }) {
    this.human = opts.human;
    this.pet = opts.pet;
    this.camera = opts.camera;
    this.world = opts.world;
    this.name = opts.petName;
    this.mood = opts.mood;
    this.reduced = opts.reduced;
    this.windowPoint = opts.windowPoint;
    this.loadClips = opts.loadClips;
    this.human.root.position.copy(HUMAN_HOME);
    this.human.root.rotation.y = this.humanYaw;
    this.human.play("Idle", { fade: 0, loop: true });
    if (this.pet) this.pet.place(PET_HOME, -0.9);
  }

  /** Swap in a newly dressed body without losing its place or its moment. */
  replaceHuman(next: HumanActor): void {
    const was = this.human;
    next.addClips(this.extraClips);
    next.root.position.copy(was.root.position);
    next.root.rotation.y = was.root.rotation.y;
    const current = was.current();
    next.play(current?.name ?? "Idle", { fade: 0, loop: current?.name === "Idle", at: current?.time ?? 0 });
    this.human = next;
    if (this.reduced) this.pose();
  }

  /** Ask for a moment. One can wait while another plays; a newer ask replaces it. */
  play(id: string): void {
    if (!findMoment(id)) return;
    if (this.run || this.cooldown > 0) {
      this.queued = id;
      return;
    }
    this.start(id);
  }

  /** Tap the pet: a happy wiggle, and the player looks. */
  boop(): void {
    if (!this.pet || this.run) return;
    this.pet.wake();
    this.pet.cue("happy");
    this.pet.faceTowards(this.human.root.position);
    this.gaze = "pet";
    this.gazeUntil = this.clock + 3;
    this.petBusyUntil = this.clock + 1.6;
  }

  private start(id: string): void {
    const moment = findMoment(id)!;
    // Only a free moment makes sense in an empty room; the rest need the pet.
    if (moment.formation !== "free" && !this.pet) return;
    const facing = this.facingFor(moment);
    this.run = {
      moment,
      phase: "approach",
      clock: 0,
      t: 0,
      length: momentLength(moment, (name) => this.human.duration(name)),
      fired: new Set(),
      humanYaw: { from: this.humanYaw, to: facing },
      petReady: !this.pet,
      prop: null,
      propState: "none",
      propScale: 0,
      propGone: false,
      flight: null,
      anchor: null,
      bowlAt: null,
      fill: 1,
      eating: false,
      atBall: false,
      loading: false,
    };
    // An emote whose clip ships in its own file: fetch it, then begin.
    const missing = moment.clips.filter((clip) => clip.src && !this.human.hasClip(clip.name));
    if (missing.length) {
      const run = this.run;
      run.loading = true;
      Promise.all(missing.map((clip) => this.loadClips(clip.src!)))
        .then((lists) => {
          for (const clips of lists) {
            this.extraClips.push(...clips);
            this.human.addClips(clips);
          }
        })
        .catch(() => {
          // The player keeps idling; the moment still happens for the pet.
        })
        .finally(() => {
          run.loading = false;
          run.length = momentLength(moment, (name) => this.human.duration(name));
        });
    }
    this.onStatus({ moment: moment.id, sentence: momentSentence(moment, this.name) });
    if (this.pet) {
      this.pet.wake();
      const spot = this.spotFor(moment, facing);
      if (spot) {
        const run = this.run;
        if (this.reduced) {
          this.pet.place(spot.at, spot.yaw);
          run.petReady = true;
        } else {
          this.pet.go(spot.at, { run: spot.at.distanceTo(this.pet.root.position) > 1.3, face: spot.yaw }).then(() => {
            run.petReady = true;
          });
        }
      } else if (this.pet.root.position.distanceTo(HUMAN_HOME) < 0.9) {
        // Still under the player's feet from the last moment: step back to
        // watch, so its face shows. The player does not wait for it.
        const watch = HUMAN_HOME.clone().add(WATCH);
        const yaw = yawToward(watch, HUMAN_HOME);
        if (this.reduced) this.pet.place(watch, yaw);
        else void this.pet.go(watch, { face: yaw });
        this.run.petReady = true;
      } else {
        this.pet.faceTowards(this.human.root.position);
        this.run.petReady = true;
      }
    }
  }

  private facingFor(moment: Moment): number {
    if (moment.facing !== undefined) return moment.facing * DEG;
    if (moment.formation === "front") return 55 * DEG;
    if (moment.formation === "beside") return 12 * DEG;
    const target = this.pet?.root.position ?? this.camera.position;
    const toward = yawToward(HUMAN_HOME, target);
    return Math.min(65 * DEG, Math.max(-5 * DEG, toward));
  }

  private spotFor(moment: Moment, facing: number): { at: Vector3; yaw: number } | null {
    if (moment.formation === "front") {
      const reach = this.pet!.reachOfMouth;
      if (moment.prop?.kind === "treat") {
        // Mouth where the hand will be, turned most of the way to the room.
        const food = toWorld(HUMAN_HOME, facing, SPOT.treat);
        const toPlayer = yawToward(food, HUMAN_HOME);
        const yaw = toPlayer + angleDelta(toPlayer, yawToward(food, this.camera.position)) * 0.75;
        return { at: food.clone().sub(forward(yaw).multiplyScalar(reach + 0.03)), yaw };
      }
      if (moment.prop?.kind === "bowl") {
        // Wait behind and aside of where the bowl will land, clear of the
        // bow that sets it down, facing the room over it.
        const bowl = toWorld(HUMAN_HOME, facing, SPOT.bowl);
        const yaw = yawToward(bowl, this.camera.position) - 0.3;
        return { at: bowl.clone().sub(forward(yaw).multiplyScalar(reach + 0.3)).add(new Vector3(0.42, 0, 0)), yaw };
      }
      const at = toWorld(HUMAN_HOME, facing, moment.petFaces === "room" ? SPOT.frontSide : SPOT.front);
      // Facing the room: toward the camera, turned a little to the player.
      const yaw = moment.petFaces === "room" ? yawToward(at, this.camera.position) - 0.35 : facing + Math.PI;
      return { at, yaw };
    }
    if (moment.formation === "beside") {
      // Whichever side is toward the middle of the room: never between the
      // player and the camera, where one would hide the other.
      const left = toWorld(HUMAN_HOME, facing, SPOT.beside);
      const right = toWorld(HUMAN_HOME, facing, SPOT.beside.clone().setX(-SPOT.beside.x));
      return { at: left.x >= right.x ? left : right, yaw: facing };
    }
    if (moment.formation === "bed") return { at: new Vector3(BED.x, 0, BED.z), yaw: -0.3 };
    return null;
  }

  private finish(): void {
    const run = this.run!;
    this.human.play("Idle", { fade: this.reduced ? 0 : 0.5, loop: true });
    if (this.pet) {
      this.pet.leanInto(null);
      if (!this.pet.asleep) this.pet.cue("idle");
    }
    run.prop?.object.removeFromParent();
    if (run.moment.id === "rest") this.napUntil = this.clock + 30;
    this.run = null;
    this.cooldown = this.reduced ? 0.1 : 0.5;
    this.petBusyUntil = this.clock + 2.5;
    this.onStatus({ moment: null, sentence: "" });
    if (this.reduced) {
      this.humanYaw = HUMAN_REST_YAW;
      if (this.pet && !this.pet.asleep) this.pet.place(PET_HOME, -0.9);
      this.pose();
    }
  }

  /** The chest: where the pet looks when it looks at the player. */
  private chest(): Vector3 {
    return this.human.root.position.clone().setY(1.2);
  }

  private fire(key: string, at: number, t: number, run: Run): boolean {
    if (run.fired.has(key) || t < at) return false;
    run.fired.add(key);
    return true;
  }

  private perform(dt: number, run: Run, frame: HumanFrame): void {
    const { moment } = run;
    const t = run.t;

    moment.clips.forEach((clip, i) => {
      if (this.fire(`clip${i}`, clip.at, t, run)) {
        this.human.play(clip.name, { fade: this.reduced ? 0 : i === 0 ? 0.3 : 0.25, loop: clip.loop === true });
        if (this.reduced) this.human.hold(clip.name, Math.max(0, moment.still - clip.at));
      }
    });
    // Done with its clips while the moment plays on: the player idles.
    const last = moment.clips[moment.clips.length - 1];
    if (!this.reduced && !last.loop && t >= last.at + this.human.duration(last.name) && this.fire("idle", 0, t, run)) {
      this.human.play("Idle", { fade: 0.4, loop: true });
    }

    if (this.pet) {
      const pet = this.pet;
      moment.pet.forEach((step, i) => {
        if (!this.fire(`pet${i}`, step.at, t, run)) return;
        if (step.cue === "eat") {
          // Go to the food, mouth first, turned so its face is to the room:
          // round to the far side of a bowl, or up to the hand with a treat.
          if (run.bowlAt) {
            // Up to the bowl, straight on, facing the room over it.
            const facing = yawToward(run.bowlAt, this.camera.position) - 0.3;
            const at = run.bowlAt.clone().sub(forward(facing).multiplyScalar(pet.reachOfMouth + 0.03));
            if (this.reduced) {
              pet.place(at, facing);
              pet.cue("eat");
            } else pet.go(at, { face: facing }).then(() => this.run === run && pet.cue("eat"));
          } else pet.cue("eat");
          run.eating = true;
        } else if (step.cue === "sleep") {
          const bed = new Vector3(BED.x, 0, BED.z);
          if (this.reduced) {
            pet.place(bed, -0.3);
            pet.cue("sleep");
          } else pet.go(bed, { face: -0.3 }).then(() => pet.cue("sleep"));
        } else if (step.cue === "fetch") {
          // The pet runs the moment the ball is in the air — see moveProp.
          run.fired.add("fetch:armed");
        } else {
          if (step.cue === "happy") run.eating = false;
          pet.cue(step.cue, this.chest());
        }
      });
    }

    // The prop: in hand, set down or thrown, then gone.
    const spec = moment.prop;
    if (spec) {
      if (this.fire("prop:show", spec.from, t, run)) {
        run.prop = makeProp(spec.kind);
        this.world.add(run.prop.object);
        run.propState = "held";
        run.propScale = this.reduced ? 1 : 0;
      }
      if (spec.release !== undefined && this.fire("prop:release", spec.release, t, run) && run.prop) {
        if (spec.kind === "ball") this.throwBall(run);
        else {
          run.propState = "placed";
          run.bowlAt = run.prop.object.position.clone().setY(0);
          run.prop.object.position.y = 0;
        }
      }
      if (this.fire("prop:hide", spec.to, t, run)) run.propGone = true;
    }

    // A hand on the pet: anchored to the real crown, the clip's stroke kept.
    const contact = moment.contact;
    if (contact && this.pet) {
      const w = this.reduced
        ? t >= contact.from && t <= contact.to
          ? 1
          : 0
        : smooth((t - contact.from) / 0.3) * smooth((contact.to - t) / 0.3);
      if (w > 0) {
        const pet = this.pet;
        if (contact.at === "mouth") {
          // The treat is in the fingers: bring the fingers to the mouth.
          frame.reach = (wrist) => {
            const fingers = this.human.palm("r").sub(wrist);
            return pet.mouth().add(new Vector3(0, 0.03, 0)).sub(fingers);
          };
          pet.leanInto(pet.mouth().add(new Vector3(0, 0.2, 0)));
        } else {
          // Anchored to the real crown; the clip's own stroke rides on top.
          frame.reach = (wrist) => {
            if (!run.anchor) run.anchor = wrist.clone();
            const crown = pet.crown(new Vector3()).add(new Vector3(0, 0.06, 0));
            // The wrist sits a palm's length short of where the fingers land.
            const toward = crown.clone().sub(this.chest()).setY(0).normalize().multiplyScalar(-0.07);
            return crown.add(toward).add(wrist.clone().sub(run.anchor));
          };
          // Push up into the hand (where it was last frame is close enough).
          pet.leanInto(this.human.bones.hand_r.getWorldPosition(new Vector3()));
        }
        frame.reachWeight = w;
      } else if (t > contact.to) {
        this.pet.leanInto(null);
      }
    }

    // Food goes down while the pet eats from the bowl.
    if (run.prop?.setFill && run.eating && run.propState === "placed" && this.pet && !this.pet.moving) {
      run.fill = Math.max(0, run.fill - dt / 2.8);
      run.prop.setFill(run.fill);
    }
  }

  private throwBall(run: Run): void {
    const from = run.prop!.object.position.clone();
    const facing = this.humanYaw;
    const to = clampToArea(toWorld(HUMAN_HOME, facing, SPOT.throw));
    const rest = clampToArea(toWorld(HUMAN_HOME, facing, new Vector3(0.14, 0, 2.28)));
    run.flight = { from, to, rest, start: run.t };
    run.propState = "flying";
  }

  private moveProp(dt: number, run: Run): void {
    const prop = run.prop;
    if (!prop) return;
    const o = prop.object;
    const target = run.propGone ? 0 : 1;
    run.propScale += Math.sign(target - run.propScale) * Math.min(Math.abs(target - run.propScale), this.reduced ? 1 : dt / 0.18);
    // A pop: a touch past full size on the way in. In the pet's mouth it
    // sits inside the scaled pet, so it is scaled back up to its own size.
    const pop = run.propGone ? run.propScale : run.propScale < 1 ? 1.12 * smooth(run.propScale * 1.2) : 1;
    o.scale.setScalar(Math.max(0.0001, pop) * (run.propState === "carried" ? 1 / PET_SCALE : 1));
    if (run.propGone && run.propScale <= 0) {
      o.removeFromParent();
      run.prop = null;
      return;
    }

    const human = this.human;
    if (run.propState === "held") {
      if (prop.kind === "bowl") {
        const l = human.palm("l");
        const r = human.palm("r");
        o.position.copy(l).add(r).multiplyScalar(0.5).add(new Vector3(0, -0.05, 0));
        o.rotation.set(0, this.humanYaw, 0);
      } else {
        const palm = human.palm("r");
        const hand = human.bones.hand_r;
        o.position.copy(palm);
        o.quaternion.copy(hand.getWorldQuaternion(o.quaternion));
        if (prop.kind === "brush") o.position.add(new Vector3(0, -0.03, 0));
        if (prop.kind === "ball") o.position.add(new Vector3(0, -0.02, 0));
      }
    } else if (run.propState === "flying" && run.flight) {
      const f = run.flight;
      const u = (run.t - f.start) / 0.72;
      if (u < 1) {
        o.position.lerpVectors(f.from, f.to, u);
        o.position.y = f.from.y * (1 - u) + 0.055 * u + 4 * 0.55 * u * (1 - u);
      } else {
        // Two small bounces, then it rolls to a stop.
        const b = (run.t - f.start - 0.72) / 0.7;
        const along = Math.min(1, b);
        o.position.lerpVectors(f.to, f.rest, 1 - (1 - along) ** 2);
        const hop = b < 0.45 ? Math.sin((b / 0.45) * Math.PI) * 0.16 : b < 0.75 ? Math.sin(((b - 0.45) / 0.3) * Math.PI) * 0.05 : 0;
        o.position.y = 0.055 + hop;
        o.rotation.x += dt * 9 * (1 - along);
        if (b >= 1) run.propState = "rest";
      }
      // The pet goes the moment the ball is in the air.
      if (this.pet && run.fired.has("fetch:armed") && !run.fired.has("fetch:run")) {
        run.fired.add("fetch:run");
        const pet = this.pet;
        const heading = yawToward(pet.root.position, f.rest);
        const at = f.rest.clone().sub(forward(heading).multiplyScalar(pet.reachOfMouth + 0.02));
        pet.go(at, { run: true, face: heading }).then(() => {
          if (this.run === run) run.atBall = true;
        });
      }
    }

    // Picked up once it has stopped and the pet is there; brought back.
    if (this.pet && run.atBall && run.propState === "rest") {
      const pet = this.pet;
      run.propState = "carried";
      pet.mouthSocket.add(o);
      o.position.set(0, 0, 0);
      o.rotation.set(0, 0, 0);
      const drop = toWorld(HUMAN_HOME, this.humanYaw, SPOT.drop);
      pet.go(drop, { run: true, face: yawToward(drop, HUMAN_HOME) }).then(() => {
        if (this.run !== run || !run.prop) return;
        const at = o.getWorldPosition(new Vector3());
        this.world.add(o);
        o.position.copy(at).setY(0.055);
        run.propState = "dropped";
        pet.cue("happy");
      });
    }
  }

  /** Reduced motion: put everyone where the current state says, once. */
  pose(): void {
    this.human.root.rotation.y = this.humanYaw;
    this.human.update(0, this.frame());
    this.pet?.update(0, true);
  }

  private frame(): HumanFrame {
    const look = this.lookPoint();
    return { look, lookWeight: look ? 1 : 0, reach: null, reachWeight: 0 };
  }

  private lookPoint(): Vector3 | null {
    const point = this.lookTarget();
    if (!point) return null;
    const at = this.human.root.position;
    const toCamera = yawToward(at, this.camera.position);
    const off = angleDelta(toCamera, yawToward(at, point));
    if (Math.abs(off) > FACE_LIMIT) {
      const yaw = toCamera + Math.sign(off) * FACE_LIMIT;
      const reach = Math.hypot(point.x - at.x, point.z - at.z);
      point.set(at.x + Math.sin(yaw) * reach, point.y, at.z + Math.cos(yaw) * reach);
    }
    return point;
  }

  private lookTarget(): Vector3 | null {
    const run = this.run;
    if (run) {
      if (run.moment.lookAt === "room" || !this.pet) return this.camera.position.clone();
      // A thrown ball is watched all the way there and back.
      if (run.prop?.kind === "ball") {
        if (run.propState === "held") return clampToArea(toWorld(HUMAN_HOME, this.humanYaw, SPOT.throw)).setY(0.3);
        return run.propState === "carried" || run.propState === "dropped" ? this.pet.mouth() : run.prop.object.position.clone();
      }
      return run.moment.formation === "front" ? this.pet.crown() : this.pet.mouth();
    }
    if (!this.pet) return this.gaze === "window" ? this.windowPoint.clone() : this.camera.position.clone();
    if (this.gaze === "camera") return this.camera.position.clone();
    if (this.gaze === "window") return this.windowPoint.clone();
    return this.pet.mouth();
  }

  /** Between moments: the pet lives by its mood, and the player watches. */
  private live(): void {
    const now = this.clock;
    if (now > this.gazeUntil) {
      const r = Math.random();
      this.gaze = !this.pet ? (r < 0.55 ? "camera" : "window") : r < 0.68 ? "pet" : r < 0.9 ? "camera" : "window";
      this.gazeUntil = now + (this.gaze === "pet" ? 4 + Math.random() * 5 : 1.8 + Math.random() * 2);
    }
    const pet = this.pet;
    if (!pet) return;
    if (pet.moving) this.gaze = "pet";
    if (pet.asleep) {
      if (now > this.napUntil) {
        pet.wake();
        pet.cue("happy");
        this.petBusyUntil = now + 2;
      }
      return;
    }
    if (this.petTrip || now < this.petBusyUntil) return;

    const mood = this.mood;
    const weights: Array<[string, number]> = [
      ["rest", 3],
      ["stroll", 2.4],
      ["visit", mood === PetMood.Lonely ? 3 : 0.9],
      ["wiggle", mood === PetMood.Radiant || mood === PetMood.Happy ? 1.6 : 0.6],
      ["camera", 1],
      ["nap", mood === PetMood.Tired ? 1.4 : 0],
      ["ask", mood === PetMood.Hungry ? 1.6 : 0],
      ["shake", mood === PetMood.Scruffy ? 1.4 : 0],
    ];
    const total = weights.reduce((s, [, w]) => s + w, 0);
    let pick = Math.random() * total;
    const choice = weights.find(([, w]) => (pick -= w) < 0)?.[0] ?? "rest";
    const slow = mood === PetMood.Tired;
    const trip = (to: Vector3, face: number | null) => {
      this.petTrip = true;
      pet.go(to, { face }).then(() => {
        this.petTrip = false;
        this.petBusyUntil = this.clock + 1.5 + Math.random() * 2.5;
      });
    };
    // Left in front of the player by a moment: back out to watch, so
    // neither hides the other.
    if (pet.root.position.z > HUMAN_HOME.z && pet.root.position.distanceTo(HUMAN_HOME) < 1) {
      const watch = HUMAN_HOME.clone().add(WATCH);
      trip(watch, yawToward(watch, HUMAN_HOME));
      return;
    }
    switch (choice) {
      case "stroll": {
        const to = new Vector3(AREA.minX + Math.random() * (AREA.maxX - AREA.minX), 0, AREA.minZ + Math.random() * (AREA.maxZ - AREA.minZ));
        if (to.distanceTo(HUMAN_HOME) < 0.75) to.x += 0.6;
        trip(to, Math.random() < 0.5 ? yawToward(to, this.camera.position) : null);
        break;
      }
      case "visit": {
        // Up to the player's side, a little behind, to look up at them.
        const to = HUMAN_HOME.clone().add(new Vector3(0.62, 0, -0.32));
        trip(to, yawToward(to, HUMAN_HOME));
        this.gaze = "pet";
        this.gazeUntil = now + 6;
        break;
      }
      case "wiggle":
        pet.cue("happy");
        this.petBusyUntil = now + 2 + Math.random() * 2;
        break;
      case "camera":
        pet.faceTowards(this.camera.position);
        this.petBusyUntil = now + 2.5 + Math.random() * 2;
        break;
      case "nap":
        this.petTrip = true;
        pet.go(new Vector3(BED.x, 0, BED.z), { face: -0.3 }).then(() => {
          this.petTrip = false;
          pet.cue("sleep");
          this.napUntil = this.clock + 18 + Math.random() * 12;
        });
        break;
      case "ask":
        pet.faceTowards(HUMAN_HOME);
        pet.cue("no");
        this.petBusyUntil = now + 3;
        break;
      case "shake":
        pet.cue("no");
        this.petBusyUntil = now + 2.5;
        break;
      default:
        this.petBusyUntil = now + (slow ? 4 : 2.5) + Math.random() * 3.5;
        if (Math.random() < 0.5) pet.faceTowards(Math.random() < 0.5 ? HUMAN_HOME : this.camera.position);
    }
  }

  private spawnZ(dt: number): void {
    const pet = this.pet;
    if (pet?.asleep && !this.reduced && this.clock - this.lastZ > 1.2) {
      this.lastZ = this.clock;
      const mesh = makeZ();
      mesh.position.copy(pet.crown()).add(new Vector3(0.08, 0.05, 0));
      this.world.add(mesh);
      this.zs.push({ mesh, born: this.clock, drift: Math.random() * 0.1 + 0.05 });
    }
    for (let i = this.zs.length - 1; i >= 0; i--) {
      const z = this.zs[i];
      const age = (this.clock - z.born) / 2.4;
      if (age >= 1) {
        z.mesh.removeFromParent();
        this.zs.splice(i, 1);
        continue;
      }
      z.mesh.position.y += dt * 0.18;
      z.mesh.position.x += dt * z.drift;
      z.mesh.lookAt(this.camera.position);
      z.mesh.scale.setScalar(Math.sin(Math.min(1, age * 1.4) * Math.PI) * 0.9 + 0.1);
    }
  }

  update(dt: number): void {
    this.clock += dt;
    if (this.cooldown > 0) {
      this.cooldown -= dt;
      if (this.cooldown <= 0 && this.queued) {
        const next = this.queued;
        this.queued = null;
        this.start(next);
      }
    }

    const frame: HumanFrame = { look: null, lookWeight: 1, reach: null, reachWeight: 0 };
    const run = this.run;
    if (run) {
      run.clock += dt;
      if (run.phase === "approach" && this.reduced) {
        // Staged at once; held at its still second once its clips are here.
        this.humanYaw = run.humanYaw.to;
        if (!run.loading) {
          run.phase = "perform";
          run.t = run.moment.still;
          this.stillHold = Math.max(2.8, Math.min(4, run.length - run.moment.still));
        }
      } else if (run.phase === "approach") {
        const turn = smooth(run.clock / 0.6);
        this.humanYaw = run.humanYaw.from + angleDelta(run.humanYaw.from, run.humanYaw.to) * turn;
        if ((run.petReady && turn >= 1 && run.clock > 0.25 && !run.loading) || run.clock > 6) {
          run.phase = "perform";
          run.t = 0;
        }
      } else {
        if (!this.reduced) run.t += dt;
        else this.stillHold -= dt;
        // Once the ball is away, the player turns to follow it out, and the pet back.
        if (!this.reduced && this.pet && run.flight) {
          const ball = run.prop && (run.propState === "flying" || run.propState === "rest") ? run.prop.object.position : this.pet.root.position;
          const toward = Math.min(90 * DEG, Math.max(-10 * DEG, yawToward(HUMAN_HOME, ball)));
          this.humanYaw = dampAngle(this.humanYaw, toward, 2.2, dt);
        }
        this.perform(dt, run, frame);
        if ((!this.reduced && run.t >= run.length) || (this.reduced && this.stillHold <= 0)) this.finish();
      }
    } else {
      if (!this.greeted) {
        this.greeted = true;
        if (this.pet) {
          this.pet.cue("happy");
          this.gaze = "camera";
          this.gazeUntil = this.clock + 2.2;
        } else if (!this.reduced) this.play("wave");
      }
      if (!this.reduced) {
        // Between moments the body turns a little toward what the eyes follow.
        const pet = this.pet;
        const want =
          pet && this.gaze === "pet"
            ? Math.min(HUMAN_REST_YAW + 0.5, Math.max(HUMAN_REST_YAW - 0.3, yawToward(HUMAN_HOME, pet.root.position)))
            : HUMAN_REST_YAW;
        this.humanYaw = dampAngle(this.humanYaw, want, 1.2, dt);
        this.live();
      }
    }

    this.human.root.rotation.y = this.humanYaw;
    frame.look = this.lookPoint();
    if (this.reduced) {
      this.human.update(0, frame);
      this.pet?.update(0, true);
    } else {
      this.human.update(dt, frame);
      this.pet?.update(dt);
    }
    // Props follow hands and mouths as they are this frame, after the IK.
    if (this.run?.moment.prop) this.moveProp(dt, this.run);
    this.spawnZ(dt);
    this.updateFocus(dt);
  }

  private readonly aim = new Vector3();

  private updateFocus(dt: number): void {
    const run = this.run;
    const target = this.aim;
    let zoom = 0;
    if (run && this.pet && run.moment.formation === "front") {
      target.copy(this.pet.crown()).lerp(this.chest(), 0.5).setY(0.72);
      zoom = 0.22;
    } else if (this.pet) {
      target.copy(this.human.root.position).lerp(this.pet.root.position, 0.45).setY(0.92);
    } else {
      target.copy(this.human.root.position).setY(0.95);
    }
    const k = 1 - Math.exp(-(this.reduced ? 60 : 1.6) * dt);
    this.focus.lerp(target, k);
    this.zoom += (zoom - this.zoom) * k;
  }

  /** Who hears what the room is doing. Returns the way to stop listening. */
  listen(onStatus: (status: DirectorStatus) => void): () => void {
    this.onStatus = onStatus;
    return () => {
      this.onStatus = () => {};
    };
  }

  setMood(mood: PetMood | null): void {
    this.mood = mood;
  }

  /** Reduced motion on or off: everything holds still, and the pet stops breathing. */
  setReduced(reduced: boolean): void {
    this.reduced = reduced;
    if (this.pet) this.pet.breathe = !reduced;
    this.pose();
  }

  /** Whether a moment is playing or waiting its turn. */
  get busy(): boolean {
    return this.run !== null || this.queued !== null;
  }

  dispose(): void {
    for (const z of this.zs) z.mesh.removeFromParent();
    this.run?.prop?.object.removeFromParent();
  }
}

