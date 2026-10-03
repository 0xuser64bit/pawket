import {
  AnimationMixer,
  Color,
  Group,
  LoopOnce,
  LoopRepeat,
  Vector3,
  type AnimationAction,
  type AnimationClip,
  type Bone,
  type Material,
  type Mesh,
  type MeshStandardMaterial,
  type MeshToonMaterial,
  type Object3D,
  type SkinnedMesh,
  type Texture,
} from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { SKIN_TONES, type PlayerLook } from "@/lib/player/look";
import { accessoriesFor } from "./accessories";
import { addOutline, skinMaterial, toon } from "./materials";
import { clothHex, DAYLIGHT, hairHex } from "./palette";
import { aimBone, dampVector, reach, worldPosition } from "./rig";


/**
 * The pack's bodies are drawn eight heads tall. A slightly larger head is
 * the one proportion change that brings them toward Pawket's friendlier
 * shapes without making them strange; hair and eyes ride on the same bone.
 */
const HEAD_SCALE = 1.15;

const HAIR_MESH = { buzzed: "hair_buzzed", parted: "hair_parted", long: "hair_long", buns: "hair_buns" } as const;

export interface HumanFrame {
  /** Where the eyes and head should go, in world space. */
  look: Vector3 | null;
  lookWeight: number;
  /**
   * Where the right wrist should go, in world space, given where the clip
   * put it this frame — called after the clip is applied, before the IK.
   */
  reach: ((clipWrist: Vector3) => Vector3) | null;
  reachWeight: number;
}

/**
 * The player in the room: one body GLB with every hairstyle and garment
 * inside it, dressed by toggling meshes, coloured by the look, animated by
 * a mixer, then finished by look-at and a reaching hand.
 */
export class HumanActor {
  readonly root = new Group();
  readonly mixer: AnimationMixer;
  readonly bones: Record<string, Bone>;
  private readonly model: Object3D;
  private readonly meshes = new Map<string, Object3D>();
  private readonly clips = new Map<string, AnimationClip>();
  private readonly weights = new Map<AnimationAction, { now: number; to: number; rate: number }>();
  private readonly skin: ReturnType<typeof skinMaterial>;
  /** Materials the look recolours, by what they are. */
  private readonly dye: Record<"top" | "bottom" | "shoes" | "hair", MeshToonMaterial[]> = { top: [], bottom: [], shoes: [], hair: [] };
  /** Bit per garment in the body's `_cover` attribute, and the sole height — from the GLB. */
  private readonly cover: Record<string, number>;
  private readonly sole: number;
  private readonly faceAxis: Vector3;
  private readonly neckAxis: Vector3;
  private readonly gaze = new Vector3();
  private gazeReady = false;
  private action: AnimationAction | null = null;
  private clock = 0;
  private nextBlink = 1.5;

  private readonly skinBase: Color;

  constructor(scene: Object3D, clips: AnimationClip[]) {
    this.model = cloneSkinned(scene);
    this.root.add(this.model);
    this.root.name = "player";

    const bones: Record<string, Bone> = {};
    this.model.traverse((object) => {
      if ((object as Bone).isBone) bones[object.name] = object as Bone;
    });
    this.bones = bones;

    // Materials: the GLB carries PBR defaults; the room draws in toon.
    const skinSource = ((this.model.getObjectByName("body") as Mesh).material as MeshStandardMaterial);
    this.skin = skinMaterial(skinSource.map as Texture, skinSource.normalMap);
    // The painting's own average tone, measured by the asset pipeline.
    this.skinBase = new Color((skinSource.userData.skinBase as string | undefined) ?? "#a67858");

    const meshes: SkinnedMesh[] = [];
    this.model.traverse((object) => {
      if ((object as SkinnedMesh).isMesh) meshes.push(object as SkinnedMesh);
    });
    // Collected first: an outline is a child mesh, and must not get one itself.
    for (const mesh of meshes) {
      mesh.frustumCulled = false;
      const source = mesh.material as MeshStandardMaterial;
      const name = source.name;
      let material: Material;
      const dyed = (slot: keyof typeof this.dye, params: Parameters<typeof toon>[0] = {}) => {
        const m = toon(params);
        this.dye[slot].push(m);
        return m;
      };
      if (name === "skin") material = this.skin.material;
      else if (name === "eyes") material = toon({ map: source.map, emissive: new Color(0x2a1e14), emissiveIntensity: 0.12 });
      else if (name.startsWith("hair")) material = dyed("hair", { map: source.map });
      else if (name === "cloth_top") material = dyed("top");
      else if (name === "cloth_bottom") material = dyed("bottom");
      else if (name === "cloth_shoes") material = dyed("shoes");
      else if (name === "sole") material = toon({ color: DAYLIGHT["ink-inverse"] });
      else material = toon({ color: source.color });
      material.name = name;
      mesh.material = material;
      if (name !== "eyes" && mesh.name !== "brows") addOutline(mesh, name === "skin" ? this.skin.uniforms.uHidden : undefined);
    }

    const extras = (this.model.getObjectByName("body")?.userData ?? {}) as { cover?: Record<string, number>; sole?: number };
    this.cover = extras.cover ?? {};
    this.sole = extras.sole ?? 0;

    // Named parts: a multi-primitive mesh arrives as a group under its node name.
    for (const name of ["body", "eyes", "brows", "beard", ...Object.values(HAIR_MESH), ...Object.keys(this.cover)]) {
      const part = this.model.getObjectByName(name);
      if (part) this.meshes.set(name, part);
    }

    this.mixer = new AnimationMixer(this.model);
    for (const clip of clips) this.clips.set(clip.name, clip);

    // Where the face and neck point, in their own space, from the rest pose.
    this.model.updateMatrixWorld(true);
    const forward = new Vector3(0, 0, 1);
    this.faceAxis = forward.clone().transformDirection(bones.Head.matrixWorld.clone().invert());
    this.neckAxis = forward.clone().transformDirection(bones.neck_01.matrixWorld.clone().invert());
    bones.Head.scale.setScalar(HEAD_SCALE);
  }

  addClips(clips: AnimationClip[]): void {
    for (const clip of clips) this.clips.set(clip.name, clip);
  }

  hasClip(name: string): boolean {
    return this.clips.has(name);
  }

  duration(name: string): number {
    return this.clips.get(name)?.duration ?? 0;
  }

  /** Dress and colour the body from a look. */
  wear(look: PlayerLook): void {
    const show = (name: string, on: boolean) => {
      const part = this.meshes.get(name);
      if (part) part.visible = on;
    };
    for (const [style, mesh] of Object.entries(HAIR_MESH)) show(mesh, look.hair === style);
    show("beard", look.beard);
    const garments = [`top_${look.top}`, `bottom_${look.bottom}`, ...(look.shoes === "none" ? [] : [`shoes_${look.shoes}`])];
    let hidden = 0;
    for (const [name, bit] of Object.entries(this.cover)) {
      const on = garments.includes(name);
      show(name, on);
      if (on) hidden |= bit;
    }
    this.skin.uniforms.uHidden.value = hidden;
    const tone = new Color(SKIN_TONES[look.skin]);
    this.skin.uniforms.uTone.value.setRGB(tone.r / this.skinBase.r, tone.g / this.skinBase.g, tone.b / this.skinBase.b);
    for (const m of this.dye.top) m.color.set(clothHex(look.topColour));
    for (const m of this.dye.bottom) m.color.set(clothHex(look.bottomColour));
    for (const m of this.dye.shoes) m.color.set(clothHex(look.shoeColour));
    // The hair texture is a grey strand map; lift the tint so it lands on the shade.
    for (const m of this.dye.hair) m.color.set(hairHex(look.hairColour)).multiplyScalar(1.45);
    this.model.position.y = look.shoes === "none" ? 0 : this.sole;
    // A hat and glasses hang from the head, measured from this body's own eyes.
    const head = this.bones.Head;
    head.getObjectByName("accessory")?.removeFromParent();
    const eyes = { l: this.bones.eye_l?.position.clone() ?? new Vector3(0.034, 0.1, 0.08), r: this.bones.eye_r?.position.clone() ?? new Vector3(-0.034, 0.1, 0.08) };
    head.add(accessoriesFor(look, eyes));
  }

  /**
   * Blend to a clip. Weights always sum to one, so a half-finished fade
   * never lets the bind pose show through.
   */
  play(name: string, { fade = 0.35, loop = false, at = 0 }: { fade?: number; loop?: boolean; at?: number } = {}): AnimationAction | null {
    const clip = this.clips.get(name);
    if (!clip) return null;
    const action = this.mixer.clipAction(clip);
    if (action !== this.action || !action.isRunning()) {
      action.reset();
      action.time = at;
    }
    action.setLoop(loop ? LoopRepeat : LoopOnce, Infinity);
    action.clampWhenFinished = true;
    action.enabled = true;
    action.play();
    for (const [other, state] of this.weights) {
      if (other !== action) {
        state.to = 0;
        state.rate = 1 / Math.max(fade, 1e-3);
      }
    }
    const state = this.weights.get(action) ?? { now: fade > 0 ? 0 : 1, to: 1, rate: 1 };
    state.to = 1;
    state.rate = 1 / Math.max(fade, 1e-3);
    if (fade <= 0) {
      state.now = 1;
      for (const [other, s] of this.weights) if (other !== action) s.now = 0;
    }
    this.weights.set(action, state);
    this.action = action;
    return action;
  }

  /** The clip playing now, and how far into it. */
  current(): { name: string; time: number } | null {
    return this.action ? { name: this.action.getClip().name, time: this.action.time } : null;
  }

  /** Pose the body at one moment of a clip and hold it there (reduced motion). */
  hold(name: string, time: number): void {
    const action = this.play(name, { fade: 0 });
    if (!action) return;
    action.time = time;
    action.paused = true;
    this.blend(0);
    this.mixer.update(0);
  }

  private blend(dt: number): void {
    let total = 0;
    for (const [action, state] of this.weights) {
      state.now += Math.sign(state.to - state.now) * Math.min(Math.abs(state.to - state.now), state.rate * dt);
      if (state.now <= 0 && state.to === 0) {
        action.stop();
        this.weights.delete(action);
        continue;
      }
      total += state.now;
    }
    for (const [action, state] of this.weights) action.setEffectiveWeight(total > 0 ? state.now / total : 0);
  }

  update(dt: number, frame: HumanFrame): void {
    this.blend(dt);
    this.mixer.update(dt);
    this.blink(dt);
    this.model.updateMatrixWorld(true);

    if (frame.look && frame.lookWeight > 0) {
      if (!this.gazeReady) {
        this.gaze.copy(frame.look);
        this.gazeReady = true;
      }
      // Eyes lead, the head follows: the gaze point moves smoothly.
      dampVector(this.gaze, frame.look, 5, dt);
      const w = frame.lookWeight;
      aimBone(this.bones.neck_01, this.neckAxis, this.gaze, w * 0.35, 0.45);
      aimBone(this.bones.Head, this.faceAxis, this.gaze, w * 0.8, 0.8);
      for (const eye of [this.bones.eye_l, this.bones.eye_r]) {
        if (eye) aimBone(eye, new Vector3(0, 0, 1), frame.look, w, 0.38);
      }
    }
    if (frame.reach && frame.reachWeight > 0) {
      const target = frame.reach(worldPosition(this.bones.hand_r));
      reach(this.bones.upperarm_r, this.bones.lowerarm_r, this.bones.hand_r, target, frame.reachWeight);
    }
  }

  /**
   * The pack has no eyelid shapes, but each eye has its own joint (added by
   * the asset pipeline): squashing it closes the eye. A blink every few
   * seconds, sometimes two. Held still (dt = 0), the eyes stay open.
   */
  private blink(dt: number): void {
    this.clock += dt;
    let open = 1;
    if (dt > 0) {
      const u = (this.clock - this.nextBlink) / 0.14;
      if (u >= 1) this.nextBlink = this.clock + (Math.random() < 0.15 ? 0.22 : 2.2 + Math.random() * 3.6);
      else if (u >= 0) open = 1 - 0.9 * Math.sin(u * Math.PI);
    }
    this.bones.eye_l?.scale.set(1, open, 1);
    this.bones.eye_r?.scale.set(1, open, 1);
  }

  /** A point in the right palm, in world space. */
  palm(side: "l" | "r", out = new Vector3()): Vector3 {
    const hand = this.bones[`hand_${side}`];
    const fingers = this.bones[`middle_01_${side}`];
    return worldPosition(hand, out).lerp(worldPosition(fingers, new Vector3()), 0.6);
  }

  dispose(): void {
    this.mixer.stopAllAction();
    this.root.removeFromParent();
  }
}

