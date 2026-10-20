import {
  BoxGeometry,
  CatmullRomCurve3,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  LatheGeometry,
  Mesh,
  MeshToonMaterial,
  Path,
  Shape,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
  type BufferGeometry,
  type Object3D,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { DecorSlot } from "@/lib/room/decor";
import { addOutline, toon } from "./materials";
import { DAYLIGHT, type Tone } from "./palette";

/**
 * The room's things in 3D (`src/lib/room/decor.ts` lists them). Built from
 * primitives in the room's own language — toon-shaded, ink-outlined,
 * Daylight colours — so a picture, a plant or a bed sits in the room as if
 * it had always been there. A few things have colours of their own (a
 * sunflower, a strawberry, a honeycomb), kept here as data like hair colours.
 *
 * Each builder draws its thing around its slot's anchor (`SLOT_AT`): a wall
 * thing faces the room from the back wall, a floor thing stands on y = 0.
 * Beds keep to the cushion's footprint — the pet naps where it always has —
 * and stay low enough that a sleeping pet is still seen.
 */

const BACK = -1.6;

/** Where each place in the room is. */
export const SLOT_AT: Record<DecorSlot, { x: number; y: number; z: number }> = {
  wall: { x: -0.1, y: 1.36, z: BACK + 0.012 },
  corner: { x: -2.2, y: 0, z: BACK + 0.45 },
  rug: { x: 0.05, y: 0.001, z: 0.32 },
  bed: { x: 1.55, y: 0, z: -0.72 },
  side: { x: 2.6, y: 0, z: BACK + 0.32 },
};

/** Colours a few things have of their own; everything else is a token. */
const OWN = {
  sunny: "#ffc84a",
  berry: "#e2434b",
  lavender: "#a88fdc",
  navy: "#22305a",
  card: "#c9955e",
  dough: "#e9b27a",
  rope: "#d8c093",
  neon: "#ff5fa2",
} as const;

type Paint = Tone | keyof typeof OWN;
const hex = (paint: Paint) => (paint in OWN ? OWN[paint as keyof typeof OWN] : DAYLIGHT[paint as Tone]);

function solid(geometry: BufferGeometry, paint: Paint, outline = true): Mesh {
  const mesh = new Mesh(geometry, toon({ color: hex(paint) }));
  if (outline) addOutline(mesh);
  return mesh;
}

function at<T extends Object3D>(object: T, x: number, y: number, z: number): T {
  object.position.set(x, y, z);
  return object;
}

/** Many small parts in one paint, as one mesh: one draw, one outline. */
function many(parts: BufferGeometry[], paint: Paint, outline = true): Mesh {
  return solid(mergeGeometries(parts.map((part) => part.toNonIndexed())), paint, outline);
}

function placed(geometry: BufferGeometry, x: number, y: number, z: number, rz = 0, ry = 0, rx = 0): BufferGeometry {
  if (rx) geometry.rotateX(rx);
  if (rz) geometry.rotateZ(rz);
  if (ry) geometry.rotateY(ry);
  return geometry.translate(x, y, z);
}

function roundedRect(width: number, height: number, radius: number, holeInset = 0): Shape {
  const shape = rect(new Shape(), width, height, radius);
  if (holeInset > 0) shape.holes.push(rect(new Path(), width - holeInset * 2, height - holeInset * 2, Math.max(0.005, radius - holeInset)));
  return shape;
}

function rect<T extends Path>(path: T, width: number, height: number, radius: number): T {
  const w = width / 2;
  const h = height / 2;
  const r = Math.min(radius, w, h);
  path.moveTo(-w + r, -h);
  path.lineTo(w - r, -h);
  path.quadraticCurveTo(w, -h, w, -h + r);
  path.lineTo(w, h - r);
  path.quadraticCurveTo(w, h, w - r, h);
  path.lineTo(-w + r, h);
  path.quadraticCurveTo(-w, h, -w, h - r);
  path.lineTo(-w, -h + r);
  path.quadraticCurveTo(-w, -h, -w + r, -h);
  return path;
}

function heartShape(size: number): Shape {
  const s = new Shape();
  s.moveTo(0, -size);
  s.bezierCurveTo(-size * 1.35, -size * 0.15, -size * 0.75, size * 1.05, 0, size * 0.42);
  s.bezierCurveTo(size * 0.75, size * 1.05, size * 1.35, -size * 0.15, 0, -size);
  return s;
}

function starShape(outer: number, inner: number, points = 5): Shape {
  const s = new Shape();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 ? inner : outer;
    const a = Math.PI / 2 + (i * Math.PI) / points;
    if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  return s;
}

const flat = (shape: Shape, depth: number) => new ExtrudeGeometry(shape, { depth, bevelEnabled: false });

/** A frame on the wall: a rounded border, the canvas sunk behind it. Art goes on `canvas`, at z 0. */
function framed(width: number, height: number, border: number, frame: Paint, canvasPaint: Paint, round = 0.03) {
  const group = new Group();
  const rim = solid(flat(roundedRect(width, height, round, border), 0.04), frame);
  group.add(rim);
  const canvas = solid(flat(roundedRect(width - border * 1.5, height - border * 1.5, round * 0.6), 0.01), canvasPaint, false);
  group.add(canvas);
  const art = new Group();
  art.position.z = 0.012;
  group.add(art);
  return { group, art };
}

/** A pot on the floor: a tapered cylinder, its rim, and the soil showing. */
function pot(radius: number, height: number, paint: Paint, band?: Paint): Group {
  const g = new Group();
  g.add(at(solid(new CylinderGeometry(radius, radius * 0.78, height, 24), paint), 0, height / 2, 0));
  g.add(at(solid(new CylinderGeometry(radius * 1.08, radius * 1.08, height * 0.16, 24), band ?? paint), 0, height * 0.92, 0));
  g.add(at(solid(new CylinderGeometry(radius * 0.94, radius * 0.94, 0.012, 20), "pet-cocoa", false), 0, height * 0.97, 0));
  return g;
}

function tube(points: Array<[number, number, number]>, radius: number, paint: Paint, closed = false): Mesh {
  const curve = new CatmullRomCurve3(points.map(([x, y, z]) => new Vector3(x, y, z)), closed);
  return solid(new TubeGeometry(curve, Math.max(16, points.length * 10), radius, 8, closed), paint);
}

function blob(radius: number, scale: [number, number, number], paint: Paint, outline = true): Mesh {
  const mesh = solid(new SphereGeometry(radius, 18, 12), paint, outline);
  mesh.scale.set(...scale);
  return mesh;
}

/** A rug lies on the floor: shapes are drawn in x/y and laid flat, front toward the room. */
function lay(object: Object3D): Object3D {
  object.rotation.x = -Math.PI / 2;
  return object;
}

/** Something that glows after dark: its materials take their own colour as light. */
function glow(meshes: Mesh[], strength: number, day = 0): (on: boolean) => void {
  return (on) => {
    for (const mesh of meshes) {
      const material = mesh.material as MeshToonMaterial;
      material.emissive = new Color(material.color);
      material.emissiveIntensity = on ? strength : day;
    }
  };
}

export interface BuiltDecor {
  object: Object3D;
  /** After dark: a lamp or a sign lights up. */
  evening?: (on: boolean) => void;
  /** Each frame: a clock keeps the time. */
  tick?: (now: Date) => void;
}

const BUILD: Record<string, () => BuiltDecor> = {
  /* ------------------------------------------------------------- the wall */

  "sea-painting": () => {
    const { group, art } = framed(0.66, 0.5, 0.07, "trim-copper", "pool-soft");
    art.add(at(solid(new CircleGeometry(0.06, 24), "sun", false), 0.14, 0.09, 0));
    const sea = new Shape();
    sea.moveTo(-0.27, -0.19);
    sea.lineTo(-0.27, -0.03);
    for (let i = 0; i < 4; i++) sea.quadraticCurveTo(-0.27 + 0.0675 * (i * 2 + 1), i % 2 ? -0.07 : 0.01, -0.27 + 0.135 * (i + 1), -0.03);
    sea.lineTo(0.27, -0.19);
    sea.closePath();
    art.add(solid(flat(sea, 0.006), "pool", false));
    const crest = new Shape();
    crest.moveTo(-0.2, -0.1);
    crest.quadraticCurveTo(-0.12, -0.05, -0.04, -0.1);
    crest.quadraticCurveTo(-0.12, -0.08, -0.2, -0.1);
    const crests = [placed(flat(crest, 0.004), 0, 0, 0.007), placed(flat(crest, 0.004), 0.2, -0.03, 0.007)];
    art.add(many(crests, "ink-inverse", false));
    const cloud = [placed(new SphereGeometry(0.035, 12, 8).scale(1.6, 0.8, 0.2), -0.12, 0.11, 0.004), placed(new SphereGeometry(0.03, 12, 8).scale(1.4, 0.8, 0.2), -0.07, 0.13, 0.004)];
    art.add(many(cloud, "surface", false));
    return { object: group };
  },

  "paw-portrait": () => {
    const { group, art } = framed(0.46, 0.56, 0.06, "trim-foil", "sun-soft", 0.12);
    art.add(at(solid(flat(heartShape(0.075), 0.01), "sun"), 0, -0.04, 0));
    const beans = [
      [-0.11, 0.07, 0.5],
      [-0.045, 0.13, 0.15],
      [0.045, 0.13, -0.15],
      [0.11, 0.07, -0.5],
    ].map(([x, y, rz]) => placed(new SphereGeometry(0.032, 14, 10).scale(0.85, 1.1, 0.25), x, y, 0.004, rz));
    art.add(many(beans, "sun"));
    return { object: group };
  },

  "wall-clock": () => {
    const group = new Group();
    group.add(at(solid(new CylinderGeometry(0.21, 0.21, 0.05, 40).rotateX(Math.PI / 2), "sun"), 0, 0, 0.025));
    group.add(at(solid(new CylinderGeometry(0.175, 0.175, 0.01, 40).rotateX(Math.PI / 2), "surface", false), 0, 0, 0.052));
    const ticks = Array.from({ length: 12 }, (_, i) => {
      const a = (i / 12) * Math.PI * 2;
      const long = i % 3 === 0;
      return placed(new BoxGeometry(0.012, long ? 0.04 : 0.022, 0.006), Math.sin(a) * 0.14, Math.cos(a) * 0.14, 0.06, -a);
    });
    group.add(many(ticks, "edge", false));
    const hour = at(new Group(), 0, 0, 0.064);
    hour.add(at(solid(new BoxGeometry(0.018, 0.085, 0.008), "edge", false), 0, 0.035, 0));
    const minute = at(new Group(), 0, 0, 0.07);
    minute.add(at(solid(new BoxGeometry(0.012, 0.125, 0.008), "edge", false), 0, 0.055, 0));
    group.add(hour, minute, at(solid(new CylinderGeometry(0.018, 0.018, 0.02, 16).rotateX(Math.PI / 2), "sun-edge", false), 0, 0, 0.074));
    let shown = -1;
    return {
      object: group,
      tick: (now) => {
        const minutes = now.getHours() * 60 + now.getMinutes();
        if (minutes === shown) return;
        shown = minutes;
        minute.rotation.z = -((minutes % 60) / 60) * Math.PI * 2;
        hour.rotation.z = -((minutes % 720) / 720) * Math.PI * 2;
      },
    };
  },

  bunting: () => {
    const group = new Group();
    const string = (x: number) => 0.08 + 0.12 * (x / 0.52) ** 2;
    group.add(tube([-0.52, -0.26, 0, 0.26, 0.52].map((x) => [x, string(x), 0.03]), 0.006, "edge"));
    const paints: Paint[] = ["sun", "pool", "sprout", "pet-blush", "sunny", "trim-glass", "sun"];
    paints.forEach((paint, i) => {
      const x = -0.42 + i * 0.14;
      const y = string(x);
      const flag = new Shape();
      flag.moveTo(-0.05, 0);
      flag.lineTo(0.05, 0);
      flag.lineTo(0, -0.12);
      flag.closePath();
      const mesh = solid(flat(flag, 0.008), paint);
      mesh.rotation.z = (x / 0.5) * -0.12;
      group.add(at(mesh, x, y, 0.025));
    });
    return { object: group };
  },

  "bat-garland": () => {
    const group = new Group();
    const string = (x: number) => 0.08 + 0.12 * (x / 0.52) ** 2;
    group.add(tube([-0.52, -0.26, 0, 0.26, 0.52].map((x) => [x, string(x), 0.03]), 0.006, "edge"));
    // One bat, wings out: a scalloped wing drawn once and mirrored, a round body, two ears.
    const wing = new Shape();
    wing.moveTo(0, 0.012);
    wing.quadraticCurveTo(0.04, 0.042, 0.078, 0.02);
    wing.quadraticCurveTo(0.068, 0.002, 0.06, -0.008);
    wing.quadraticCurveTo(0.052, 0.002, 0.044, -0.012);
    wing.quadraticCurveTo(0.034, -0.002, 0.024, -0.016);
    wing.quadraticCurveTo(0.012, -0.006, 0, -0.012);
    wing.closePath();
    const bats: BufferGeometry[] = [];
    for (const [i, x] of [-0.38, -0.19, 0, 0.19, 0.38].entries()) {
      const y = string(x) - 0.045;
      const tilt = (i % 2 ? 1 : -1) * 0.12;
      bats.push(placed(flat(wing, 0.008), x + 0.012, y, 0.03, tilt));
      bats.push(placed(flat(wing, 0.008).scale(-1, 1, 1), x - 0.012, y, 0.03, tilt));
      bats.push(placed(new SphereGeometry(0.022, 12, 10).scale(1, 1.15, 0.6), x, y, 0.034));
      for (const side of [-1, 1]) bats.push(placed(new ConeGeometry(0.008, 0.02, 4), x + side * 0.01, y + 0.03, 0.034, -side * 0.25));
    }
    group.add(many(bats, "navy"));
    return { object: group };
  },

  "blossom-scroll": () => {
    const group = new Group();
    group.add(at(solid(flat(roundedRect(0.34, 0.62, 0.01), 0.01), "surface"), 0, 0, 0.01));
    for (const y of [0.33, -0.33]) {
      group.add(at(solid(new CylinderGeometry(0.018, 0.018, 0.42, 12).rotateZ(Math.PI / 2), "trim-copper"), 0, y, 0.03));
    }
    group.add(tube([[0.19, 0.34, 0.03], [0, 0.47, 0.02], [-0.19, 0.34, 0.03]], 0.004, "edge"));
    group.add(tube([[-0.14, -0.26, 0.02], [-0.05, -0.08, 0.022], [0.02, 0.06, 0.024], [0.12, 0.2, 0.022]], 0.012, "pet-cocoa"));
    group.add(tube([[-0.02, 0.0, 0.022], [0.09, 0.02, 0.022], [0.13, 0.08, 0.022]], 0.008, "pet-cocoa"));
    const flowers: BufferGeometry[] = [];
    for (const [x, y, s] of [[0.12, 0.21, 1], [0.04, 0.1, 0.9], [0.13, 0.08, 0.8], [-0.07, -0.02, 1], [-0.1, -0.16, 0.85], [0.02, 0.24, 0.7]]) {
      for (let p = 0; p < 5; p++) {
        const a = (p / 5) * Math.PI * 2;
        flowers.push(placed(new SphereGeometry(0.018 * s, 10, 8).scale(1, 1, 0.3), x + Math.cos(a) * 0.022 * s, y + Math.sin(a) * 0.022 * s, 0.032));
      }
    }
    group.add(many(flowers, "pet-blush"));
    return { object: group };
  },

  "aurora-print": () => {
    const { group, art } = framed(0.62, 0.46, 0.05, "edge", "navy");
    const band = (y: number, amp: number, paint: Paint) => {
      const s = new Shape();
      s.moveTo(-0.27, y);
      for (let i = 0; i < 3; i++) s.quadraticCurveTo(-0.27 + 0.09 * (i * 2 + 1), y + (i % 2 ? -amp : amp), -0.27 + 0.18 * (i + 1), y);
      s.lineTo(0.27, y - 0.05);
      for (let i = 2; i >= 0; i--) s.quadraticCurveTo(-0.27 + 0.09 * (i * 2 + 1), y - 0.05 + (i % 2 ? -amp : amp), -0.27 + 0.18 * i, y - 0.05);
      s.closePath();
      return solid(flat(s, 0.004), paint, false);
    };
    art.add(at(band(0.12, 0.05, "sprout"), 0, 0, 0.002), at(band(0.04, 0.04, "trim-glass"), 0, 0, 0.004));
    const stars = [[-0.2, 0.15], [0.05, 0.17], [0.21, 0.12], [-0.08, 0.02], [0.16, 0.0]].map(([x, y]) => placed(new SphereGeometry(0.008, 8, 6), x, y, 0.008));
    art.add(many(stars, "ink-inverse", false));
    const hills = new Shape();
    hills.moveTo(-0.27, -0.17);
    hills.lineTo(-0.27, -0.08);
    hills.lineTo(-0.12, -0.02);
    hills.lineTo(0.0, -0.1);
    hills.lineTo(0.12, -0.04);
    hills.lineTo(0.27, -0.11);
    hills.lineTo(0.27, -0.17);
    hills.closePath();
    art.add(at(solid(flat(hills, 0.006), "edge", false), 0, 0, 0.006));
    return { object: group };
  },

  "star-chart": () => {
    const group = new Group();
    group.add(at(solid(new TorusGeometry(0.25, 0.028, 12, 48), "trim-foil"), 0, 0, 0.03));
    group.add(at(solid(new CylinderGeometry(0.25, 0.25, 0.012, 48).rotateX(Math.PI / 2), "navy", false), 0, 0, 0.01));
    const moon = new Shape();
    moon.absarc(0, 0, 0.09, Math.PI * 0.35, Math.PI * 1.65, false);
    moon.absarc(0.045, 0, 0.075, Math.PI * 1.55, Math.PI * 0.45, true);
    group.add(at(solid(flat(moon, 0.01), "sunny"), -0.05, 0.03, 0.02));
    const stars = [[0.12, 0.11, 1], [0.15, -0.08, 0.7], [-0.13, -0.13, 0.8], [0.03, -0.15, 0.6], [0.08, 0.02, 0.5]].map(([x, y, s]) =>
      placed(flat(starShape(0.03 * s, 0.013 * s), 0.006), x, y, 0.02),
    );
    group.add(many(stars, "sunny", false));
    return { object: group };
  },

  "sun-mirror": () => {
    const group = new Group();
    const rays = Array.from({ length: 14 }, (_, i) => {
      const a = (i / 14) * Math.PI * 2;
      const ray = new Shape();
      ray.moveTo(-0.028, 0);
      ray.lineTo(0.028, 0);
      ray.lineTo(0, i % 2 ? 0.1 : 0.15);
      ray.closePath();
      return placed(flat(ray, 0.02), Math.cos(a) * 0.15, Math.sin(a) * 0.15, 0.005, a - Math.PI / 2);
    });
    group.add(many(rays, "trim-copper"));
    group.add(at(solid(new TorusGeometry(0.15, 0.025, 10, 40), "sun-edge"), 0, 0, 0.03));
    const glass = solid(new CylinderGeometry(0.135, 0.135, 0.012, 40).rotateX(Math.PI / 2), "pool-soft", false);
    (glass.material as MeshToonMaterial).emissive = new Color(DAYLIGHT["pool-soft"]);
    (glass.material as MeshToonMaterial).emissiveIntensity = 0.25;
    group.add(at(glass, 0, 0, 0.022));
    group.add(at(solid(new BoxGeometry(0.03, 0.12, 0.004), "surface", false), -0.04, 0.03, 0.03));
    return { object: group };
  },

  "front-page": () => {
    const { group, art } = framed(0.46, 0.58, 0.035, "edge", "surface", 0.01);
    art.add(at(solid(new BoxGeometry(0.34, 0.06, 0.004), "edge", false), 0, 0.2, 0));
    const lines = Array.from({ length: 6 }, (_, i) => placed(new BoxGeometry(i % 3 === 2 ? 0.1 : 0.15, 0.012, 0.003), 0.085, 0.1 - i * 0.04, 0.002));
    lines.push(...Array.from({ length: 4 }, (_, i) => placed(new BoxGeometry(0.34, 0.012, 0.003), 0, -0.16 - i * 0.03, 0.002)));
    art.add(many(lines, "edge-soft", false));
    art.add(at(solid(new BoxGeometry(0.15, 0.17, 0.004), "sun-soft", false), -0.09, 0.03, 0));
    const pawBeans = [[-0.025, 0.05], [-0.008, 0.07], [0.012, 0.07], [0.028, 0.05]].map(([x, y]) => placed(new SphereGeometry(0.012, 10, 8).scale(1, 1.2, 0.3), x - 0.09, y + 0.0, 0.004));
    pawBeans.push(placed(new SphereGeometry(0.028, 12, 8).scale(1.2, 0.9, 0.3), -0.09, 0.0, 0.004));
    art.add(many(pawBeans, "sun", false));
    return { object: group };
  },

  "neon-heart": () => {
    const group = new Group();
    const points: Array<[number, number, number]> = [];
    for (let i = 0; i <= 40; i++) {
      const t = (i / 40) * Math.PI * 2;
      // The heart curve, at the size of a sign.
      const x = 16 * Math.sin(t) ** 3;
      const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      points.push([x * 0.014, y * 0.014 + 0.02, 0.05]);
    }
    const neon = tube(points.slice(0, -1), 0.016, "neon", true);
    group.add(neon);
    for (const [x, y] of [[-0.16, 0.12], [0.16, 0.12], [0, -0.2]]) {
      group.add(at(solid(new CylinderGeometry(0.012, 0.012, 0.05, 8).rotateX(Math.PI / 2), "edge-soft", false), x, y, 0.025));
    }
    return { object: group, evening: glow([neon], 1.1, 0.35) };
  },

  /* ----------------------------------------------------------- the corner */

  fern: () => {
    const group = pot(0.16, 0.3, "trim-copper");
    for (const [x, y, z, rx, rz, s] of [
      [0, 0.55, 0, 0, 0, 1],
      [-0.12, 0.46, 0.04, 0.2, 0.55, 0.85],
      [0.13, 0.48, -0.02, -0.1, -0.6, 0.85],
      [0.02, 0.44, 0.12, 0.6, 0.1, 0.75],
    ]) {
      const leaf = blob(0.12, [0.55 * s, 1.5 * s, 0.35 * s], "sprout");
      leaf.position.set(x, y, z);
      leaf.rotation.set(rx, 0, rz);
      group.add(leaf);
    }
    return { object: group };
  },

  cactus: () => {
    const group = pot(0.15, 0.24, "trim-copper", "sun");
    const body = blob(0.13, [1, 2.2, 1], "sprout");
    group.add(at(body, 0, 0.46, 0));
    for (const side of [-1, 1]) {
      const arm = new Group();
      arm.add(at(blob(0.05, [1, 1.9, 1], "sprout"), 0, 0.08, 0));
      arm.add(at(blob(0.045, [1.6, 0.9, 1], "sprout"), -side * 0.04, 0.0, 0));
      group.add(at(arm, side * 0.15, side > 0 ? 0.5 : 0.42, 0));
    }
    const spines = [0, 1, 2, 3, 4, 5].map((i) => placed(new ConeGeometry(0.008, 0.03, 5), Math.cos(i) * 0.1, 0.36 + i * 0.05, 0.1 + Math.sin(i) * 0.02, -0.4 + i * 0.15, 0, 1.2));
    group.add(many(spines, "ink-inverse", false));
    const flower = [0, 1, 2, 3, 4].map((i) => placed(new SphereGeometry(0.025, 10, 8).scale(1, 0.5, 1), Math.cos((i / 5) * Math.PI * 2) * 0.025, 0.75, Math.sin((i / 5) * Math.PI * 2) * 0.025));
    group.add(many(flower, "pet-blush"));
    return { object: group };
  },

  monstera: () => {
    const group = pot(0.17, 0.28, "surface", "pool");
    // A monstera leaf: heart-based, with three slits cut in from each side.
    const half: Array<[number, number]> = [[0.45, -1], [0.75, -0.7], [0.8, -0.35], [0.33, -0.24], [0.86, -0.05], [0.36, 0.1], [0.8, 0.3], [0.33, 0.42], [0.62, 0.64]];
    const leaf = () => {
      const s = new Shape();
      s.moveTo(0, -0.72 * 0.17);
      for (const [x, y] of half) s.lineTo(x * 0.17, y * 0.17);
      s.quadraticCurveTo(0.35 * 0.17, 0.95 * 0.17, 0, 1.02 * 0.17);
      s.quadraticCurveTo(-0.35 * 0.17, 0.95 * 0.17, -0.62 * 0.17, 0.64 * 0.17);
      for (const [x, y] of [...half].reverse().slice(1)) s.lineTo(-x * 0.17, y * 0.17);
      s.closePath();
      return flat(s, 0.012);
    };
    for (const [x, y, z, rx, ry, rz] of [
      [0, 0.86, -0.04, -0.3, 0, 0],
      [-0.2, 0.7, 0.02, -0.5, 0.5, 0.7],
      [0.2, 0.72, 0.0, -0.45, -0.5, -0.7],
      [-0.08, 0.6, 0.16, -1.0, 0.2, 0.3],
      [0.1, 0.58, 0.15, -1.05, -0.3, -0.4],
    ]) {
      const mesh = solid(leaf(), "sprout");
      mesh.rotation.set(rx, ry, rz);
      group.add(at(mesh, x, y, z));
      group.add(tube([[0, 0.28, 0], [x * 0.5, (0.28 + y) / 2, z * 0.4], [x * 0.9, y - 0.12, z * 0.9]], 0.008, "sprout-edge"));
    }
    return { object: group };
  },

  sunflower: () => {
    const group = pot(0.14, 0.24, "pool", "pool-edge");
    group.add(tube([[0, 0.24, 0], [0.02, 0.6, 0.02], [-0.01, 0.9, 0.04], [0, 1.08, 0.06]], 0.014, "sprout-edge"));
    for (const [y, side] of [[0.55, 1], [0.72, -1]]) {
      const leaf = blob(0.08, [1.5, 0.35, 0.8], "sprout");
      leaf.rotation.z = side * 0.4;
      group.add(at(leaf, side * 0.09, y, 0.02));
    }
    const head = new Group();
    head.add(solid(new CylinderGeometry(0.075, 0.075, 0.04, 24).rotateX(Math.PI / 2), "pet-cocoa"));
    const petals = Array.from({ length: 12 }, (_, i) => {
      const a = (i / 12) * Math.PI * 2;
      return placed(new SphereGeometry(0.05, 12, 8).scale(0.45, 1, 0.2), Math.cos(a) * 0.11, Math.sin(a) * 0.11, -0.004, a - Math.PI / 2);
    });
    head.add(many(petals, "sunny"));
    head.rotation.x = -0.25;
    head.rotation.y = 0.5;
    group.add(at(head, 0, 1.12, 0.07));
    return { object: group };
  },

  "pumpkin-lantern": () => {
    const group = new Group();
    // As tall as a potted plant: a pumpkin of 0.3 m radius, its face to scale.
    const k = 1.5;
    const r = 0.2 * k;
    // Ribbed: six lobes around the middle, one paint, one outline.
    const lobes = Array.from({ length: 6 }, (_, i) => {
      const a = (i / 6) * Math.PI * 2;
      return placed(new SphereGeometry(r * 0.62, 18, 12).scale(0.62, 0.84, 1), Math.sin(a) * r * 0.36, r * 0.86, Math.cos(a) * r * 0.36, 0, a);
    });
    group.add(many(lobes, "sun"));
    group.add(at(solid(new CylinderGeometry(0.022 * k, 0.03 * k, 0.09 * k, 10), "sprout-edge"), 0.01, r * 1.72, 0));
    // The carved face, lit from inside: two eyes and a grin, on the front.
    const eye = new Shape();
    eye.moveTo(-0.028, 0);
    eye.lineTo(0.028, 0);
    eye.lineTo(0, 0.04);
    eye.closePath();
    const grin = new Shape();
    grin.moveTo(-0.075, 0.012);
    grin.quadraticCurveTo(0, -0.07, 0.075, 0.012);
    grin.lineTo(0.045, 0.004);
    grin.lineTo(0.03, 0.026);
    grin.lineTo(0.012, 0.0);
    grin.lineTo(-0.012, 0.0);
    grin.lineTo(-0.03, 0.026);
    grin.lineTo(-0.045, 0.004);
    grin.closePath();
    const face = many(
      [
        placed(flat(eye, 0.01).scale(k, k, 1), -0.055 * k, r * 1.0, r * 0.98, 0, 0, -0.12),
        placed(flat(eye, 0.01).scale(k, k, 1), 0.055 * k, r * 1.0, r * 0.98, 0, 0, -0.12),
        placed(flat(grin, 0.01).scale(k, k, 1), 0, r * 0.72, r * 1.0, 0, 0, 0.1),
      ],
      "sunny",
      false,
    );
    group.add(face);
    return { object: group, evening: glow([face], 1.3, 0.25) };
  },

  bonsai: () => {
    const group = new Group();
    group.add(at(solid(new BoxGeometry(0.42, 0.1, 0.26), "trim-glass"), 0, 0.05, 0));
    group.add(at(solid(new BoxGeometry(0.38, 0.012, 0.22), "pet-cocoa", false), 0, 0.104, 0));
    for (const [x, z] of [[-0.12, 0.05], [0.13, -0.06]]) group.add(at(blob(0.025, [1.3, 0.7, 1], "edge-soft"), x, 0.12, z));
    group.add(tube([[0, 0.1, 0], [0.05, 0.22, 0], [-0.04, 0.34, 0.02], [0.06, 0.46, 0.0], [0.14, 0.52, 0]], 0.03, "pet-cocoa"));
    group.add(tube([[-0.03, 0.34, 0.02], [-0.12, 0.42, 0.02], [-0.18, 0.44, 0.02]], 0.018, "pet-cocoa"));
    for (const [x, y, z, s] of [[0.15, 0.55, 0, 1], [-0.18, 0.47, 0.02, 0.8], [0.0, 0.6, -0.02, 0.85]]) {
      group.add(at(blob(0.12 * s, [1.5, 0.7, 1.1], "sprout"), x, y, z));
    }
    return { object: group };
  },

  "lavender-pot": () => {
    const group = pot(0.16, 0.26, "surface", "lavender");
    const stems: BufferGeometry[] = [];
    const tops: BufferGeometry[] = [];
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + 0.3;
      const lean = 0.08 + (i % 3) * 0.05;
      const h = 0.42 + (i % 4) * 0.06;
      const tip = new Vector3(Math.cos(a) * lean, 0.26 + h, Math.sin(a) * lean);
      const base = new Vector3(Math.cos(a) * 0.03, 0.25, Math.sin(a) * 0.03);
      stems.push(new TubeGeometry(new CatmullRomCurve3([base, base.clone().lerp(tip, 0.5).setY(0.25 + h * 0.55), tip]), 8, 0.006, 5));
      tops.push(placed(new SphereGeometry(0.028, 10, 8).scale(0.8, 2.4, 0.8), tip.x, tip.y + 0.05, tip.z));
    }
    group.add(many(stems, "sprout-edge", false));
    group.add(many(tops, "lavender"));
    return { object: group };
  },

  /* -------------------------------------------------------------- the rug */

  "meadow-rug": () => ({ object: lay(solid(flat(roundedRect(2.7, 1.6, 0.4), 0.012), "sprout-soft")) }),

  "round-rug": () => {
    const group = new Group();
    for (const [r, paint, y] of [[1.0, "sun", 0], [0.82, "sun-soft", 0.003], [0.6, "sun", 0.006], [0.42, "sun-soft", 0.009]] as const) {
      group.add(at(solid(new CylinderGeometry(r, r, 0.006, 56), paint, r === 1.0), 0, y, 0));
    }
    group.scale.set(1.3, 1, 0.85);
    return { object: group };
  },

  "striped-rug": () => {
    const group = new Group();
    group.add(lay(solid(flat(roundedRect(2.5, 1.5, 0.08), 0.01), "ink-inverse")));
    const stripes = [-0.5, -0.25, 0, 0.25, 0.5].map((y) => placed(new BoxGeometry(2.36, 0.11, 0.004), 0, y, 0.012));
    group.add(lay(many(stripes, "pool", false)));
    const fringe = Array.from({ length: 16 }, (_, i) => [-1, 1].map((side) => placed(new BoxGeometry(0.06, 0.02, 0.004), side * 1.28, -0.6 + i * 0.08, 0.004))).flat();
    group.add(lay(many(fringe, "edge-soft", false)));
    return { object: group };
  },

  "heart-rug": () => {
    const group = new Group();
    const outer = solid(flat(heartShape(0.95), 0.012), "pet-blush");
    const inner = solid(flat(heartShape(0.7), 0.004), "sun-soft", false);
    inner.position.set(0, -0.06, 0.014);
    const heart = new Group();
    heart.add(outer, inner);
    heart.scale.set(1.25, 1, 1);
    group.add(lay(heart));
    group.position.z = 0.1;
    return { object: group };
  },

  "strawberry-rug": () => {
    const group = new Group();
    const berry = new Shape();
    berry.moveTo(0, -0.95);
    berry.bezierCurveTo(-0.9, -0.5, -1.2, 0.55, -0.55, 0.62);
    berry.quadraticCurveTo(0, 0.72, 0.55, 0.62);
    berry.bezierCurveTo(1.2, 0.55, 0.9, -0.5, 0, -0.95);
    const body = solid(flat(berry, 0.012), "berry");
    const seeds: BufferGeometry[] = [];
    for (let row = 0; row < 5; row++) {
      for (let col = -3; col <= 3; col++) {
        const x = col * 0.22 + (row % 2) * 0.11;
        const y = 0.38 - row * 0.26;
        if (Math.abs(x) > 0.75 - row * 0.12) continue;
        seeds.push(placed(new SphereGeometry(0.035, 8, 6).scale(0.7, 1, 0.2), x, y, 0.014));
      }
    }
    const leaves = solid(flat(starShape(0.42, 0.18, 6), 0.01), "sprout");
    leaves.position.set(0, 0.62, 0.013);
    leaves.scale.set(1.2, 0.55, 1);
    const fruit = new Group();
    fruit.add(body, many(seeds, "sunny", false), leaves);
    fruit.scale.set(1.15, 0.95, 1);
    group.add(lay(fruit));
    return { object: group };
  },

  "honeycomb-rug": () => {
    const group = new Group();
    const hexagon = (r: number) => {
      const s = new Shape();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
        if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      return s;
    };
    const cells: Array<[number, number]> = [[0, 0]];
    // Neighbours of a pointed-top cell sit √3 × its radius away: the cells touch.
    for (let i = 0; i < 6; i++) cells.push([Math.cos((i / 6) * Math.PI * 2) * 0.52, Math.sin((i / 6) * Math.PI * 2) * 0.52]);
    const outer = cells.map(([x, y]) => placed(flat(hexagon(0.3), 0.012), x, y, 0));
    const inner = cells.map(([x, y]) => placed(flat(hexagon(0.2), 0.004), x, y, 0.013));
    const comb = new Group();
    comb.add(many(outer, "sunny"), many(inner, "sun-soft", false));
    comb.scale.set(1.3, 0.9, 1);
    group.add(lay(comb));
    return { object: group };
  },

  /* -------------------------------------------------------------- the bed */

  basket: () => {
    const group = new Group();
    const profile = [new Vector2(0, 0), new Vector2(0.36, 0), new Vector2(0.42, 0.04), new Vector2(0.45, 0.17), new Vector2(0.41, 0.18), new Vector2(0.38, 0.06), new Vector2(0, 0.06)];
    const basket = solid(new LatheGeometry(profile, 36), "trim-copper");
    group.add(basket);
    const weave = [0.06, 0.11].map((y) => placed(new TorusGeometry(0.43 + y * 0.12, 0.007, 6, 48).rotateX(Math.PI / 2), 0, y, 0));
    group.add(many(weave, "sun-edge", false));
    group.add(at(solid(new TorusGeometry(0.43, 0.035, 10, 40).rotateX(Math.PI / 2), "trim-copper"), 0, 0.175, 0));
    group.add(at(blob(0.34, [1, 0.16, 1], "pet-cream"), 0, 0.07, 0));
    return { object: group };
  },

  "cloud-bed": () => {
    const group = new Group();
    const puffs = Array.from({ length: 8 }, (_, i) => {
      const a = (i / 8) * Math.PI * 2;
      return placed(new SphereGeometry(0.13 + (i % 2) * 0.02, 16, 12).scale(1, 0.75, 1), Math.cos(a) * 0.36, 0.1, Math.sin(a) * 0.36);
    });
    group.add(many(puffs, "pet-cloud"));
    group.add(at(blob(0.38, [1, 0.12, 1], "pet-cloud-shade", false), 0, 0.05, 0));
    return { object: group };
  },

  "box-bed": () => {
    const group = new Group();
    const w = 0.66;
    const d = 0.54;
    const h = 0.2;
    const t = 0.018;
    const walls = [
      placed(new BoxGeometry(w, t, d), 0, t / 2, 0),
      placed(new BoxGeometry(w, h, t), 0, h / 2, -d / 2),
      placed(new BoxGeometry(w, h * 0.75, t), 0, (h * 0.75) / 2, d / 2),
      placed(new BoxGeometry(t, h, d), -w / 2, h / 2, 0),
      placed(new BoxGeometry(t, h, d), w / 2, h / 2, 0),
    ];
    group.add(many(walls, "card"));
    for (const side of [-1, 1]) {
      const flap = solid(new BoxGeometry(t, 0.16, d), "card");
      flap.position.set(side * (w / 2 + 0.06), h + 0.04, 0);
      flap.rotation.z = side * -0.9;
      group.add(flap);
    }
    group.add(at(solid(new BoxGeometry(0.1, 0.07, 0.004), "trim-cloth", false), 0, h * 0.4, d / 2 + 0.012));
    group.rotation.y = -0.25;
    return { object: group };
  },

  "donut-bed": () => {
    const group = new Group();
    group.add(at(solid(new TorusGeometry(0.33, 0.11, 14, 36).rotateX(Math.PI / 2), "dough"), 0, 0.1, 0));
    const icing = solid(new TorusGeometry(0.33, 0.085, 12, 36, Math.PI * 2).rotateX(Math.PI / 2), "pet-blush", false);
    icing.scale.set(1, 0.6, 1);
    group.add(at(icing, 0, 0.165, 0));
    const paints: Paint[] = ["pool", "sunny", "sprout", "surface"];
    for (const [p, paint] of paints.entries()) {
      const bits = Array.from({ length: 6 }, (_, i) => {
        const a = ((i * 4 + p) / 24) * Math.PI * 2 + 0.2;
        const r = 0.31 + ((i + p) % 3) * 0.035;
        return placed(new CylinderGeometry(0.008, 0.008, 0.04, 5), Math.cos(a) * r, 0.21, Math.sin(a) * r, Math.PI / 2, a * 1.7);
      });
      group.add(many(bits, paint, false));
    }
    group.add(at(blob(0.27, [1, 0.12, 1], "sun-soft", false), 0, 0.04, 0));
    return { object: group };
  },

  "shell-bed": () => {
    const group = new Group();
    const profile = [new Vector2(0, 0), new Vector2(0.38, 0), new Vector2(0.44, 0.06), new Vector2(0.4, 0.08), new Vector2(0, 0.05)];
    group.add(solid(new LatheGeometry(profile, 32), "pet-cream"));
    // The upper shell, open behind the pet: a fan with a scalloped edge, its ribs raised.
    const fan = new Shape();
    fan.moveTo(-0.42, 0);
    const bumps = 7;
    for (let i = 0; i < bumps; i++) {
      const a0 = Math.PI - (i / bumps) * Math.PI;
      const a1 = Math.PI - ((i + 1) / bumps) * Math.PI;
      const mid = (a0 + a1) / 2;
      fan.quadraticCurveTo(Math.cos(mid) * 0.5, Math.sin(mid) * 0.5, Math.cos(a1) * 0.42, Math.sin(a1) * 0.42);
    }
    fan.lineTo(-0.42, 0);
    const back = new Group();
    back.add(solid(flat(fan, 0.04), "pet-blush"));
    const ribs = Array.from({ length: bumps - 1 }, (_, i) => {
      const a = Math.PI - ((i + 1) / bumps) * Math.PI;
      const rib = new BoxGeometry(0.018, 0.36, 0.012);
      rib.translate(0, 0.2, 0);
      rib.rotateZ(a - Math.PI / 2);
      return rib.translate(0, 0, 0.045);
    });
    back.add(many(ribs, "sun-soft", false));
    back.rotation.x = -0.35;
    group.add(at(back, 0, 0.05, -0.3));
    group.add(at(blob(0.32, [1, 0.12, 0.9], "sun-soft", false), 0, 0.06, 0.02));
    return { object: group };
  },

  "mug-bed": () => {
    const group = new Group();
    const profile = [new Vector2(0, 0), new Vector2(0.4, 0), new Vector2(0.42, 0.24), new Vector2(0.38, 0.24), new Vector2(0.36, 0.04), new Vector2(0, 0.04)];
    const mug = solid(new LatheGeometry(profile, 36), "surface");
    group.add(mug);
    group.add(at(solid(new CylinderGeometry(0.424, 0.42, 0.05, 36, 1, true), "sun", false), 0, 0.14, 0));
    const handle = solid(new TorusGeometry(0.1, 0.03, 10, 24, Math.PI * 1.2), "surface");
    handle.rotation.set(0, Math.PI / 2, Math.PI * 0.4);
    group.add(at(handle, 0.43, 0.14, 0));
    group.add(at(solid(new CylinderGeometry(0.36, 0.36, 0.02, 32), "pet-cocoa", false), 0, 0.07, 0));
    const marshmallows = [[0.18, 0.12], [-0.2, 0.08], [0.05, -0.22]].map(([x, z]) => placed(new BoxGeometry(0.07, 0.05, 0.07), x, 0.1, z, 0, x * 3));
    group.add(many(marshmallows, "pet-cloud"));
    return { object: group };
  },

  /* ---------------------------------------------------------- by the bed */

  "floor-lamp": () => {
    const group = new Group();
    group.add(at(solid(new CylinderGeometry(0.16, 0.18, 0.04, 28), "edge"), 0, 0.02, 0));
    group.add(at(solid(new CylinderGeometry(0.014, 0.014, 1.5, 8), "edge"), 0, 0.77, 0));
    const shade = solid(new CylinderGeometry(0.16, 0.26, 0.28, 28, 1, true), "sun-soft");
    (shade.material as MeshToonMaterial).side = DoubleSide;
    group.add(at(shade, 0, 1.6, 0));
    const bulb = solid(new SphereGeometry(0.06, 14, 10), "sunny", false);
    group.add(at(bulb, 0, 1.53, 0));
    return { object: group, evening: glow([shade, bulb], 0.9) };
  },

  bookcase: () => {
    const group = new Group();
    const w = 0.72;
    const h = 1.22;
    const d = 0.3;
    const t = 0.03;
    const frame = [
      placed(new BoxGeometry(t, h, d), -w / 2, h / 2, 0),
      placed(new BoxGeometry(t, h, d), w / 2, h / 2, 0),
      placed(new BoxGeometry(w, t, d), 0, h, 0),
      placed(new BoxGeometry(w, t, d), 0, 0.04, 0),
      placed(new BoxGeometry(w, t, d), 0, 0.42, 0),
      placed(new BoxGeometry(w, t, d), 0, 0.8, 0),
      placed(new BoxGeometry(w, h, 0.01), 0, h / 2, -d / 2),
    ];
    group.add(many(frame, "trim-copper"));
    const paints: Paint[] = ["pool", "sun", "sprout", "trim-glass", "pet-blush", "sunny"];
    const shelves = [0.055, 0.435, 0.815];
    shelves.forEach((y, s) => {
      let x = -w / 2 + 0.05;
      let i = s * 2;
      while (x < w / 2 - 0.12) {
        const bw = 0.045 + ((i * 7) % 3) * 0.012;
        const bh = 0.24 + ((i * 5) % 4) * 0.025;
        const book = solid(new BoxGeometry(bw, bh, d * 0.75), paints[i % paints.length]);
        book.position.set(x + bw / 2, y + t / 2 + bh / 2, 0.01);
        if (i % 5 === 4) {
          book.rotation.z = -0.3;
          book.position.x += 0.04;
          x += 0.06;
        }
        group.add(book);
        x += bw + 0.008;
        i++;
      }
    });
    const plant = pot(0.07, 0.12, "surface", "sprout");
    for (const [x, rz] of [[-0.04, 0.5], [0.04, -0.5], [0, 0]]) {
      const leaf = at(blob(0.05, [0.5, 1.3, 0.4], "sprout"), x, 0.2, 0);
      leaf.rotation.z = rz;
      plant.add(leaf);
    }
    group.add(at(plant, 0.18, h + t / 2, 0));
    return { object: group };
  },

  "cat-tree": () => {
    const group = new Group();
    group.add(at(solid(new BoxGeometry(0.56, 0.06, 0.46), "trim-cloth"), 0, 0.03, 0));
    const post = solid(new CylinderGeometry(0.06, 0.06, 1.05, 16), "rope");
    group.add(at(post, -0.08, 0.58, 0));
    const rings = Array.from({ length: 9 }, (_, i) => placed(new TorusGeometry(0.062, 0.006, 6, 20).rotateX(Math.PI / 2), -0.08, 0.15 + i * 0.1, 0));
    group.add(many(rings, "trim-cloth", false));
    group.add(at(solid(new CylinderGeometry(0.2, 0.2, 0.05, 24), "trim-cloth"), 0.05, 0.62, 0.02));
    const top = new Group();
    const profile = [new Vector2(0, 0), new Vector2(0.18, 0), new Vector2(0.22, 0.03), new Vector2(0.23, 0.09), new Vector2(0.2, 0.09), new Vector2(0.18, 0.03), new Vector2(0, 0.03)];
    const cup = solid(new LatheGeometry(profile, 28), "trim-cloth");
    top.add(cup);
    group.add(at(top, -0.08, 1.1, 0));
    group.add(at(solid(new CylinderGeometry(0.003, 0.003, 0.28, 4), "edge", false), 0.2, 0.47, 0.06));
    group.add(at(blob(0.04, [1, 1, 1], "pet-blush"), 0.2, 0.31, 0.06));
    return { object: group };
  },

  "leaf-pile": () => {
    const group = new Group();
    // A low mound, half in the floor, under a scatter of leaves laid on its slope.
    group.add(blob(0.42, [1, 0.42, 0.74], "sun-edge"));
    const leaf = new Shape();
    leaf.moveTo(0, -0.07);
    leaf.quadraticCurveTo(0.055, -0.014, 0, 0.07);
    leaf.quadraticCurveTo(-0.055, -0.014, 0, -0.07);
    const paints: Paint[] = ["sun", "sunny", "berry", "sun-edge"];
    const leaves: BufferGeometry[][] = paints.map(() => []);
    for (let i = 0; i < 40; i++) {
      // The golden angle spreads them evenly round the pile, without chance.
      const around = i * 2.39996;
      const up = 0.12 + (i % 7) * 0.2;
      const x = Math.cos(around) * Math.cos(up) * 0.42;
      const z = Math.sin(around) * Math.cos(up) * 0.31;
      const y = Math.sin(up) * 0.176 + 0.004;
      leaves[i % paints.length].push(placed(flat(leaf, 0.006), x, y, z, around, around * 0.5, -Math.PI / 2 + up * 0.8));
    }
    paints.forEach((paint, i) => group.add(many(leaves[i], paint, false)));
    return { object: group };
  },
};

/** The thing `id` in 3D, or null for an id the room does not know. */
export function buildDecor(id: string): BuiltDecor | null {
  const build = BUILD[id];
  return build ? build() : null;
}

/** Every id the room can build: held to the catalog by `decor.test.ts`. */
export const DECOR_BUILT = Object.keys(BUILD);
