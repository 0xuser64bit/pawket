import {
  CatmullRomCurve3,
  CylinderGeometry,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  Mesh,
  Shape,
  SphereGeometry,
  TubeGeometry,
  Vector3,
  type BufferGeometry,
  type Object3D,
} from "three";
import { WEARABLES } from "@/lib/closet/catalog";
import { addOutline, toon } from "./materials";
import { DAYLIGHT, type Tone } from "./palette";

/**
 * The wardrobe in 3D. Every item in `src/lib/closet/catalog.ts` has a shape
 * here, fitted to Kenney's cube animals — all three share one body box, so
 * one fit serves every species. Units are the body node's, before the pet
 * is scaled: the face is +Z, the box is about ±0.62 wide, 0–1.41 tall and
 * −0.63…0.70 deep.
 *
 * Looks only, like the catalog: nothing here reaches a vital.
 */

function part(geometry: BufferGeometry, tone: Tone, outline = true): Mesh {
  const mesh = new Mesh(geometry, toon({ color: DAYLIGHT[tone] }));
  if (outline) addOutline(mesh);
  return mesh;
}

/** A closed loop hugging the box at height `y`, `out` metres off its sides. */
function band(y: number, out: number, radius: number): TubeGeometry {
  const w = 0.62 + out;
  const front = 0.7 + out;
  const back = -0.63 - out;
  const r = 0.22;
  const points: Vector3[] = [];
  const corners: Array<[number, number, number]> = [
    [w - r, front - r, 0],
    [-(w - r), front - r, Math.PI / 2],
    [-(w - r), back + r, Math.PI],
    [w - r, back + r, (3 * Math.PI) / 2],
  ];
  for (const [cx, cz, start] of corners) {
    for (let i = 0; i <= 4; i++) {
      const a = start + (i / 4) * (Math.PI / 2);
      points.push(new Vector3(cx + Math.cos(a) * r, y, cz + Math.sin(a) * r));
    }
  }
  return new TubeGeometry(new CatmullRomCurve3(points, true), 64, radius, 8, true);
}

function heart(size: number, depth: number): ExtrudeGeometry {
  const s = new Shape();
  s.moveTo(0, -size);
  s.bezierCurveTo(-size * 1.3, -size * 0.1, -size * 0.7, size, 0, size * 0.45);
  s.bezierCurveTo(size * 0.7, size, size * 1.3, -size * 0.1, 0, -size);
  return new ExtrudeGeometry(s, { depth, bevelEnabled: false });
}

function star(outer: number, inner: number, depth: number): ExtrudeGeometry {
  const s = new Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? inner : outer;
    const a = Math.PI / 2 + (i * Math.PI) / 5;
    if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  return new ExtrudeGeometry(s, { depth, bevelEnabled: false });
}

const FIT: Record<string, () => Object3D> = {
  "wool-scarf": () => {
    const g = new Group();
    g.add(part(band(0.34, 0.05, 0.1), "pool"));
    const knot = part(new SphereGeometry(0.13, 16, 12), "pool");
    knot.position.set(0.34, 0.34, 0.8);
    g.add(knot);
    for (const [x, tilt] of [
      [0.3, 0.12],
      [0.44, -0.08],
    ]) {
      const tail = part(new CylinderGeometry(0.075, 0.09, 0.42, 10), "pool");
      tail.position.set(x, 0.14, 0.82);
      tail.rotation.z = tilt;
      g.add(tail);
    }
    return g;
  },
  "paper-crown": () => {
    const geometry = new CylinderGeometry(0.34, 0.36, 0.28, 16, 1, true);
    const pos = geometry.getAttribute("position");
    for (let i = 0; i < pos.count; i++) {
      if (pos.getY(i) > 0) {
        const a = Math.atan2(pos.getZ(i), pos.getX(i));
        const k = Math.round(((a + Math.PI) / (Math.PI * 2)) * 16);
        pos.setY(i, 0.14 + (k % 2 ? -0.1 : 0.06));
      }
    }
    geometry.computeVertexNormals();
    const crown = part(geometry, "trim-foil");
    (crown.material as { side: typeof DoubleSide }).side = DoubleSide;
    crown.position.set(0.06, 1.52, 0.02);
    crown.rotation.z = -0.12;
    return crown;
  },
  "red-collar": () => {
    const g = new Group();
    g.add(part(band(0.16, 0.03, 0.05), "sun-edge"));
    const tag = part(heart(0.09, 0.03), "trim-foil");
    tag.position.set(0, 0.05, 0.76);
    g.add(tag);
    return g;
  },
  "star-pin": () => {
    const pin = part(star(0.13, 0.055, 0.04), "trim-foil");
    pin.position.set(0.36, 0.3, 0.7);
    pin.rotation.z = 0.2;
    return pin;
  },
  "rain-cape": () => {
    // A U-shaped band over the top and down both sides, laid along the back.
    const outer = 0.68;
    const inner = outer - 0.035;
    const top = 1.46;
    const low = 0.62;
    const r = 0.16;
    const band = new Shape();
    band.moveTo(-outer, low);
    band.lineTo(-outer, top - r);
    band.quadraticCurveTo(-outer, top, -outer + r, top);
    band.lineTo(outer - r, top);
    band.quadraticCurveTo(outer, top, outer, top - r);
    band.lineTo(outer, low);
    band.lineTo(inner, low);
    band.lineTo(inner, top - r - 0.02);
    band.quadraticCurveTo(inner, top - 0.035, inner - r + 0.02, top - 0.035);
    band.lineTo(-inner + r - 0.02, top - 0.035);
    band.quadraticCurveTo(-inner, top - 0.035, -inner, top - r - 0.02);
    band.lineTo(-inner, low);
    band.closePath();
    const cape = part(new ExtrudeGeometry(band, { depth: 0.9, bevelEnabled: false }), "trim-glass");
    cape.position.z = -0.68;
    const g = new Group();
    g.add(cape);
    const clasp = part(new SphereGeometry(0.07, 12, 10), "trim-foil");
    clasp.position.set(0, top + 0.02, 0.24);
    g.add(clasp);
    return g;
  },
  "nap-ribbon": () => {
    const g = new Group();
    for (const side of [-1, 1]) {
      const loop = part(new SphereGeometry(0.15, 16, 12), "sprout");
      loop.scale.set(1.2, 0.8, 0.45);
      loop.position.set(side * 0.16, 0, 0);
      loop.rotation.z = side * 0.35;
      g.add(loop);
    }
    g.add(part(new SphereGeometry(0.07, 12, 10), "sprout-edge"));
    g.position.set(0.3, 1.48, 0.18);
    g.rotation.z = -0.25;
    return g;
  },
};

/** The item's shape, ready to parent to the pet's body, or null if none exists. */
export function wearableFor(id: string): Object3D | null {
  const make = FIT[id];
  if (!make) return null;
  const item = make();
  item.name = "wearable";
  return item;
}

/** Whether the room can draw this item. Anything it cannot stays a word. */
export function isShownIn3D(id: string): boolean {
  return id in FIT;
}

/** Catalog ids with no shape yet — kept at zero by `wearables.test.ts`. */
export function wearablesWithoutShape(): string[] {
  return WEARABLES.filter((item) => !(item.id in FIT)).map((item) => item.id);
}
