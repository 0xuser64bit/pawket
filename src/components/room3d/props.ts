import {
  CapsuleGeometry,
  CylinderGeometry,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  LatheGeometry,
  Mesh,
  Shape,
  SphereGeometry,
  Vector2,
  Vector3,
  type BufferGeometry,
} from "three";
import type { PropKind } from "@/lib/room/moments";
import { addOutline, toon } from "./materials";
import { DAYLIGHT, type Tone } from "./palette";

/**
 * What a hand holds in a moment: the bowl, a treat, the brush, the ball —
 * and the drifting Z of a pet asleep. Metres, built at the room's scale.
 */

function part(geometry: BufferGeometry, tone: Tone, { outline = true, double = false } = {}): Mesh {
  const mesh = new Mesh(geometry, toon({ color: DAYLIGHT[tone], ...(double ? { side: DoubleSide } : {}) }));
  if (outline) addOutline(mesh);
  return mesh;
}

export interface Prop {
  kind: PropKind;
  object: Group;
  /** For the bowl: how much food is left, 0–1. */
  setFill?: (fill: number) => void;
}

function bowl(): Prop {
  const g = new Group();
  const profile = [
    [0.0, 0.0],
    [0.075, 0.0],
    [0.1, 0.012],
    [0.118, 0.05],
    [0.12, 0.062],
    [0.108, 0.062],
    [0.1, 0.02],
    [0.0, 0.02],
  ].map(([x, y]) => new Vector2(x, y));
  g.add(part(new LatheGeometry(profile, 28), "sun", { double: true }));
  const food = part(new SphereGeometry(0.092, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), "trim-copper");
  food.scale.y = 0.55;
  food.position.y = 0.03;
  g.add(food);
  return {
    kind: "bowl",
    object: g,
    setFill: (fill) => {
      food.visible = fill > 0.02;
      food.scale.set(0.6 + 0.4 * fill, 0.55 * fill + 0.05, 0.6 + 0.4 * fill);
    },
  };
}

function treat(): Prop {
  const g = new Group();
  const bar = part(new CapsuleGeometry(0.014, 0.05, 4, 10), "sun-soft");
  bar.rotation.z = Math.PI / 2;
  g.add(bar);
  for (const x of [-0.034, 0.034])
    for (const z of [-0.012, 0.012]) {
      const knob = part(new SphereGeometry(0.016, 10, 8), "sun-soft");
      knob.position.set(x, 0, z);
      g.add(knob);
    }
  return { kind: "treat", object: g };
}

function brush(): Prop {
  const g = new Group();
  const handle = part(new CylinderGeometry(0.014, 0.016, 0.12, 10), "trim-copper");
  handle.rotation.x = Math.PI / 2;
  handle.position.z = -0.07;
  g.add(handle);
  const head = part(new CapsuleGeometry(0.03, 0.05, 4, 10), "trim-copper");
  head.rotation.x = Math.PI / 2;
  head.scale.set(1.2, 1, 0.6);
  g.add(head);
  const bristles = part(new CapsuleGeometry(0.026, 0.05, 4, 10), "ink-inverse");
  bristles.rotation.x = Math.PI / 2;
  bristles.scale.set(1.1, 1, 0.5);
  bristles.position.y = -0.018;
  g.add(bristles);
  return { kind: "brush", object: g };
}

/** The handle is gripped in the palm; the brush head stays level, ahead of the fingers. */
export function brushHeadAt(palm: Vector3, wrist: Vector3): Vector3 {
  return palm.clone().add(palm.clone().sub(wrist).setY(0).normalize().multiplyScalar(0.07));
}

function ball(): Prop {
  const g = new Group();
  g.add(part(new SphereGeometry(0.055, 20, 14), "sprout"));
  const seam = part(new CylinderGeometry(0.0565, 0.0565, 0.008, 24, 1, true), "ink-inverse", { outline: false, double: true });
  seam.rotation.x = 0.5;
  g.add(seam);
  return { kind: "ball", object: g };
}

export function makeProp(kind: PropKind): Prop {
  const prop = kind === "bowl" ? bowl() : kind === "treat" ? treat() : kind === "brush" ? brush() : ball();
  prop.object.name = `prop:${kind}`;
  return prop;
}

/** A single Z, drawn flat and outlined, that a sleeping pet breathes out. */
export function makeZ(): Mesh {
  const s = new Shape();
  s.moveTo(-0.05, 0.05);
  s.lineTo(0.05, 0.05);
  s.lineTo(0.05, 0.032);
  s.lineTo(-0.02, -0.032);
  s.lineTo(0.05, -0.032);
  s.lineTo(0.05, -0.05);
  s.lineTo(-0.05, -0.05);
  s.lineTo(-0.05, -0.032);
  s.lineTo(0.02, 0.032);
  s.lineTo(-0.05, 0.032);
  s.closePath();
  return part(new ExtrudeGeometry(s, { depth: 0.012, bevelEnabled: false }), "pool-edge");
}
