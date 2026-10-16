import {
  AnimationMixer,
  Group,
  LoopRepeat,
  Quaternion,
  Vector3,
  type AnimationAction,
  type AnimationClip,
  type Mesh,
  type MeshStandardMaterial,
  type Object3D,
} from "three";
import type { PetCue } from "@/lib/room/moments";
import { addOutline, toon } from "./materials";
import { angleDelta, dampAngle } from "./rig";
import { wearableFor } from "./wearables";

/** Kenney's cube animals are about 1.6 m; ours come up to a person's thigh. */
export const PET_SCALE = 0.47;

/** Points on the body, in the body node's unscaled space. */
const CROWN = new Vector3(0, 1.4, 0.1);
const MOUTH = new Vector3(0, 0.46, 0.72);

const WALK_SPEED = 0.55;
const RUN_SPEED = 1.7;
const TURN_RATE = 7;
/** A hop, from leaving the floor to landing. */
const HOP_SECONDS = 0.42;

type Mode = "idle" | "eat" | "nibble" | "dance" | "sleep" | "happy" | "no";

interface Trip {
  to: Vector3;
  run: boolean;
  face: number | null;
  done: () => void;
}

/**
 * The pet in the room: a Kenney cube animal in Pawket colours, moved by
 * walking and running between spots, animated by its own clips, and
 * finished with the small things the clips do not have — a hop, a lean
 * into a hand, lying down, and the design system's breath.
 */
export class PetActor {
  readonly root = new Group();
  readonly body: Object3D;
  yaw = 0;
  private readonly model: Object3D;
  private readonly legs: Object3D[] = [];
  private readonly mixer: AnimationMixer;
  private readonly actions = new Map<string, AnimationAction>();
  private readonly weights = new Map<AnimationAction, { now: number; to: number }>();
  private base: AnimationAction | null = null;
  private trip: Trip | null = null;
  private faceTo: number | null = null;
  private mode: Mode = "idle";
  private modeUntil = 0;
  private clock = 0;
  private hopAt = -1;
  private leanTo: Vector3 | null = null;
  private lean = 0;
  private sleep = 0;
  private sleeping = false;
  /** A clip held at one frame for a photo; while set, nothing else plays. */
  private held: string | null = null;
  private readonly carried = new Group();
  private readonly bodyRest: { position: Vector3; quaternion: Quaternion };
  breathe = true;

  constructor(scene: Object3D, clips: AnimationClip[], wearing: string | null) {
    this.model = scene.clone(true);
    this.model.scale.setScalar(PET_SCALE);
    this.root.add(this.model);
    this.root.name = "pet";
    this.body = this.model.getObjectByName("body")!;
    this.bodyRest = { position: this.body.position.clone(), quaternion: this.body.quaternion.clone() };
    const meshes: Mesh[] = [];
    this.model.traverse((object) => {
      if (object.name.startsWith("leg-")) this.legs.push(object);
      if ((object as Mesh).isMesh) meshes.push(object as Mesh);
    });
    for (const mesh of meshes) {
      const source = mesh.material as MeshStandardMaterial;
      mesh.material = toon({ vertexColors: Boolean(mesh.geometry.getAttribute("color")), color: source.color });
      addOutline(mesh);
    }
    this.mixer = new AnimationMixer(this.model);
    for (const clip of clips) this.actions.set(clip.name, this.mixer.clipAction(clip));
    this.body.add(this.carried);
    this.carried.position.copy(MOUTH).add(new Vector3(0, -0.05, 0.08));
    this.wear(wearing);
    this.play("idle", 0);
  }

  /** Put on the wardrobe item, if there is one, in 3D. */
  wear(id: string | null): void {
    this.body.getObjectByName("wearable")?.removeFromParent();
    const item = id ? wearableFor(id) : null;
    if (item) this.body.add(item);
  }

  private play(name: string, fade = 0.2): void {
    const action = this.actions.get(name);
    if (!action || action === this.base) return;
    action.reset().setLoop(LoopRepeat, Infinity).play();
    for (const [other, state] of this.weights) if (other !== action) state.to = 0;
    this.weights.set(action, { now: fade > 0 ? 0 : 1, to: 1 });
    if (fade <= 0) for (const [other, state] of this.weights) if (other !== action) state.now = 0;
    this.base = action;
  }

  /**
   * Hold one frame of a clip — and, if asked, the top of a hop — for a
   * photo, at once: no blend to wait for. `null` lets the pet live again.
   */
  hold(name: string | null, at = 0, hop = false): void {
    const action = name ? this.actions.get(name) : undefined;
    if (this.held) this.actions.get(this.held)!.paused = false;
    this.held = action ? name : null;
    if (!action) return;
    this.wake();
    this.stop();
    this.play(name!, 0);
    action.time = at;
    action.paused = true;
    this.hopAt = hop ? this.clock - HOP_SECONDS / 2 : -1;
  }

  place(at: Vector3, yaw: number): void {
    this.stop();
    this.root.position.copy(at);
    this.yaw = yaw;
    this.root.rotation.y = yaw;
  }

  /** Stand still: a walk under way ends where it is, and whoever waits on it hears so. */
  private stop(): void {
    const trip = this.trip;
    this.trip = null;
    this.faceTo = null;
    trip?.done();
  }

  /** Walk or run to a spot, then turn to `face` (radians) if given. */
  go(to: Vector3, { run = false, face = null }: { run?: boolean; face?: number | null } = {}): Promise<void> {
    this.wake();
    this.trip?.done();
    return new Promise((done) => {
      this.trip = { to: to.clone().setY(0), run, face, done };
      this.faceTo = null;
    });
  }

  get moving(): boolean {
    return this.trip !== null;
  }

  face(yaw: number): void {
    this.faceTo = yaw;
  }

  faceTowards(point: Vector3): void {
    this.faceTo = Math.atan2(point.x - this.root.position.x, point.z - this.root.position.z);
  }

  /** Turn toward the hand on the crown, and push up into it. */
  leanInto(point: Vector3 | null): void {
    this.leanTo = point ? point.clone() : null;
  }

  cue(cue: PetCue, towards?: Vector3): void {
    if (cue !== "sleep") this.wake();
    switch (cue) {
      case "look":
        if (towards) this.faceTowards(towards);
        break;
      case "happy":
        this.setMode("happy", 0.9);
        this.hop();
        break;
      case "no":
        this.setMode("no", 0.9);
        break;
      case "hop":
        this.hop();
        break;
      case "dance":
        this.setMode("dance", Infinity);
        break;
      case "eat":
        this.setMode("eat", Infinity);
        break;
      case "nibble":
        // From a hand, not the floor: reach up and take small bites.
        this.setMode("nibble", Infinity);
        break;
      case "lean":
        break;
      case "sleep":
        this.sleeping = true;
        break;
      case "idle":
      case "fetch":
        this.setMode("idle", 0);
        break;
    }
  }

  private setMode(mode: Mode, seconds: number): void {
    this.mode = mode;
    this.modeUntil = this.clock + seconds;
  }

  hop(): void {
    if (this.hopAt < 0 || this.clock - this.hopAt > 0.45) this.hopAt = this.clock;
  }

  wake(): void {
    this.sleeping = false;
  }

  get asleep(): boolean {
    return this.sleeping;
  }

  /** Where a hand rests on the head, in world space. */
  crown(out = new Vector3()): Vector3 {
    return this.body.localToWorld(out.copy(CROWN));
  }

  mouth(out = new Vector3()): Vector3 {
    return this.body.localToWorld(out.copy(MOUTH));
  }

  /** Something held in the mouth (the ball) goes here. */
  get mouthSocket(): Object3D {
    return this.carried;
  }

  /** Metres from the pet's centre to the front of its face. */
  get reachOfMouth(): number {
    return MOUTH.z * PET_SCALE;
  }

  update(dt: number, still = false): void {
    this.clock += dt;
    if (this.mode !== "idle" && this.clock > this.modeUntil) this.mode = "idle";

    // Travel: turn toward the goal first, then go, easing in at the end.
    let speed = 0;
    if (this.trip) {
      const offset = this.trip.to.clone().sub(this.root.position);
      const distance = offset.length();
      if (distance < 0.02) {
        this.root.position.copy(this.trip.to);
        const trip = this.trip;
        this.trip = null;
        if (trip.face !== null) this.faceTo = trip.face;
        trip.done();
      } else {
        const heading = Math.atan2(offset.x, offset.z);
        this.yaw = dampAngle(this.yaw, heading, TURN_RATE, dt);
        const aligned = Math.cos(angleDelta(this.yaw, heading));
        const top = this.trip.run ? RUN_SPEED : WALK_SPEED;
        speed = Math.min(top, distance * 3 + 0.12) * Math.max(0, aligned);
        const step = Math.min(distance, speed * dt);
        this.root.position.addScaledVector(offset.normalize(), step);
      }
    } else if (this.faceTo !== null) {
      this.yaw = dampAngle(this.yaw, this.faceTo, TURN_RATE * 0.8, dt);
      if (Math.abs(angleDelta(this.yaw, this.faceTo)) < 0.01) this.faceTo = null;
    }
    this.root.rotation.y = this.yaw;

    // Clip choice.
    const turning = this.faceTo !== null && Math.abs(angleDelta(this.yaw, this.faceTo)) > 0.15;
    const want = this.sleeping
      ? "idle"
      : this.trip
        ? speed > WALK_SPEED * 1.4 || this.trip.run
          ? "run"
          : "walk"
        : turning
          ? "walk"
          : this.mode === "happy"
            ? "gesture-positive"
            : this.mode === "no"
              ? "gesture-negative"
              : this.mode === "nibble"
                ? "idle"
                : this.mode;
    this.play(this.held ?? want);
    const walk = this.actions.get("walk");
    if (walk) walk.timeScale = this.trip ? Math.max(0.6, speed / WALK_SPEED) : 0.8;

    // Blend weights: normalised, so the rest pose never shows through.
    let total = 0;
    for (const [action, state] of this.weights) {
      state.now += Math.sign(state.to - state.now) * Math.min(Math.abs(state.to - state.now), dt / 0.2);
      if (state.now <= 0 && state.to === 0) {
        action.stop();
        this.weights.delete(action);
      } else total += state.now;
    }
    for (const [action, state] of this.weights) action.setEffectiveWeight(total ? state.now / total : 0);
    // Clips only write what they animate; start each frame from rest so the
    // touches below never accumulate.
    this.body.position.copy(this.bodyRest.position);
    this.body.quaternion.copy(this.bodyRest.quaternion);
    this.mixer.update(still ? 0 : dt * (this.sleeping ? 0.35 : 1));

    // Lying down: settle onto the tucked legs.
    this.sleep += ((this.sleeping ? 1 : 0) - this.sleep) * (1 - Math.exp(-3 * dt));
    for (const leg of this.legs) leg.scale.y = 1 - 0.7 * this.sleep;
    this.body.position.y -= 0.2 * this.sleep;

    // The hop, with a squash as it lands.
    let lift = 0;
    let squash = 0;
    const h = this.clock - this.hopAt;
    if (this.hopAt >= 0 && h < HOP_SECONDS) {
      const x = h / HOP_SECONDS;
      lift = 4 * 0.13 * x * (1 - x);
      squash = x > 0.85 ? (x - 0.85) / 0.15 : x < 0.12 ? 1 - x / 0.12 : 0;
    }
    // The breath — 1 → 1.035 × 0.975 over 3.6 s, from the feet — at a
    // little over half strength, because the idle clip already bobs.
    // Asleep, it slows.
    const period = 3.6 * (this.sleeping ? 1.6 : 1);
    const b = this.breathe && !still ? ((1 - Math.cos((this.clock / period) * Math.PI * 2)) / 2) * 0.6 : 0;
    const wide = PET_SCALE * (1 + 0.035 * b + 0.06 * squash);
    this.model.position.y = lift;
    this.model.scale.set(wide, PET_SCALE * (1 - 0.025 * b - 0.1 * squash), wide);

    // Leaning into a hand: tip toward it and rise to meet it.
    this.lean += ((this.leanTo ? 1 : 0) - this.lean) * (1 - Math.exp(-5 * dt));
    if (this.lean > 0.001) {
      const toward = (this.leanTo ?? this.crown()).clone();
      this.body.worldToLocal(toward);
      const tilt = new Quaternion().setFromAxisAngle(new Vector3(toward.z > 0 ? 1 : -1, 0, 0), -0.1 * this.lean);
      const sway = Math.sin(this.clock * 2.2) * 0.06 * this.lean;
      this.body.quaternion.multiply(tilt).multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), sway));
      this.body.position.y += 0.03 * this.lean;
    }
    if (this.mode === "nibble") {
      // Quick little bites toward whatever it is leaning into.
      const bite = Math.max(0, Math.sin(this.clock * 13)) * 0.09;
      this.body.quaternion.multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), bite));
    }
  }

  dispose(): void {
    this.mixer.stopAllAction();
    this.root.removeFromParent();
  }
}
