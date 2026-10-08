import {
  BoxGeometry,
  CatmullRomCurve3,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  Mesh,
  Shape,
  SphereGeometry,
  TorusGeometry,
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

/** Where the eyes sit on the front face: glasses are fitted to them. */
const EYES = { y: 0.6, x: 0.2, z: 0.71 };

/** A dome over the top of the box, for a hat. */
function dome(radius: number, squash: number, tone: Tone): Mesh {
  const mesh = part(new SphereGeometry(radius, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), tone);
  mesh.scale.set(1, squash, 1);
  return mesh;
}

/** A flattened sphere: a leaf, a petal, a wing. */
function blob(radius: number, scale: [number, number, number], tone: Tone): Mesh {
  const mesh = part(new SphereGeometry(radius, 16, 12), tone);
  mesh.scale.set(...scale);
  return mesh;
}

Object.assign(FIT, {
  "bow-tie": () => {
    const g = new Group();
    for (const side of [-1, 1]) {
      const wing = part(new ConeGeometry(0.12, 0.22, 4), "pool");
      wing.rotation.z = (side * Math.PI) / 2;
      wing.scale.z = 0.45;
      wing.position.set(side * 0.11, 0.2, 0.74);
      g.add(wing);
    }
    const knot = part(new SphereGeometry(0.06, 12, 10), "pool-edge");
    knot.position.set(0, 0.2, 0.77);
    g.add(knot);
    return g;
  },
  "round-glasses": () => {
    const g = new Group();
    for (const side of [-1, 1]) {
      const ring = part(new TorusGeometry(0.12, 0.022, 8, 28), "edge");
      ring.position.set(side * EYES.x, EYES.y, EYES.z + 0.03);
      g.add(ring);
      const arm = part(new CylinderGeometry(0.015, 0.015, 0.2, 6), "edge", false);
      arm.rotation.z = Math.PI / 2;
      arm.position.set(side * (EYES.x + 0.21), EYES.y + 0.02, EYES.z + 0.02);
      g.add(arm);
    }
    const bridge = part(new CylinderGeometry(0.015, 0.015, EYES.x * 2 - 0.24, 6), "edge", false);
    bridge.rotation.z = Math.PI / 2;
    bridge.position.set(0, EYES.y + 0.03, EYES.z + 0.03);
    g.add(bridge);
    return g;
  },
  "heart-glasses": () => {
    const g = new Group();
    for (const side of [-1, 1]) {
      const lens = part(heart(0.11, 0.03), "pet-blush");
      lens.position.set(side * EYES.x, EYES.y + 0.02, EYES.z);
      g.add(lens);
    }
    const bridge = part(new CylinderGeometry(0.015, 0.015, EYES.x * 2 - 0.2, 6), "edge", false);
    bridge.rotation.z = Math.PI / 2;
    bridge.position.set(0, EYES.y + 0.06, EYES.z + 0.02);
    g.add(bridge);
    return g;
  },
  "party-hat": () => {
    const g = new Group();
    const cone = part(new ConeGeometry(0.27, 0.64, 24), "sun");
    cone.position.y = 0.32;
    g.add(cone);
    for (const [y, r] of [
      [0.16, 0.205],
      [0.38, 0.12],
    ]) {
      const stripe = part(new TorusGeometry(r, 0.022, 6, 24), "sun-edge", false);
      stripe.rotation.x = Math.PI / 2;
      stripe.position.y = y;
      g.add(stripe);
    }
    const pompom = part(new SphereGeometry(0.075, 12, 10), "trim-foil");
    pompom.position.y = 0.66;
    g.add(pompom);
    g.position.set(0.1, 1.41, 0.04);
    g.rotation.z = -0.2;
    return g;
  },
  bandana: () => {
    const s = new Shape();
    s.moveTo(-0.46, 0);
    s.quadraticCurveTo(0, -0.06, 0.46, 0);
    s.lineTo(0, -0.36);
    s.closePath();
    const cloth = part(new ExtrudeGeometry(s, { depth: 0.025, bevelEnabled: false }), "sprout");
    cloth.position.set(0, 0.36, 0.7);
    const g = new Group();
    g.add(cloth);
    for (const [x, y] of [
      [-0.16, 0.3],
      [0.16, 0.3],
      [0, 0.17],
    ]) {
      const dot = part(new CylinderGeometry(0.03, 0.03, 0.01, 12), "surface", false);
      dot.rotation.x = Math.PI / 2;
      dot.position.set(x, y, 0.73);
      g.add(dot);
    }
    return g;
  },
  "knit-beanie": () => {
    const g = new Group();
    const cap = dome(0.5, 0.62, "pool");
    g.add(cap);
    const cuff = part(new CylinderGeometry(0.52, 0.52, 0.12, 24), "pool-edge");
    cuff.position.y = 0.04;
    g.add(cuff);
    const pompom = part(new SphereGeometry(0.11, 14, 10), "surface");
    pompom.position.y = 0.34;
    g.add(pompom);
    g.position.set(0, 1.38, 0.04);
    return g;
  },
  "bee-wings": () => {
    const g = new Group();
    for (const side of [-1, 1]) {
      const wing = blob(0.34, [1, 0.62, 0.12], "pet-cloud");
      wing.position.set(side * 0.62, 1.05, -0.5);
      wing.rotation.set(0, side * 0.7, side * 0.45);
      g.add(wing);
      const small = blob(0.22, [1, 0.6, 0.12], "pet-cloud");
      small.position.set(side * 0.58, 0.72, -0.52);
      small.rotation.set(0, side * 0.7, side * -0.3);
      g.add(small);
    }
    return g;
  },
  "little-backpack": () => {
    const g = new Group();
    const pack = part(new BoxGeometry(0.62, 0.66, 0.28), "sun");
    pack.position.set(0, 0.76, -0.76);
    g.add(pack);
    const pocket = part(new BoxGeometry(0.4, 0.24, 0.1), "sun-edge");
    pocket.position.set(0, 0.6, -0.94);
    g.add(pocket);
    // The pet is all head, so its straps would cross its crown: the pack alone reads as a pack.
    return g;
  },
  "strawberry-hat": () => {
    const g = new Group();
    const berry = dome(0.46, 0.8, "pet-blush");
    g.add(berry);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const seed = part(new SphereGeometry(0.025, 8, 6), "pet-cream", false);
      seed.position.set(Math.cos(a) * 0.36, 0.18 + (i % 2) * 0.08, Math.sin(a) * 0.36);
      g.add(seed);
    }
    for (let i = 0; i < 4; i++) {
      const leaf = blob(0.14, [1, 0.3, 0.55], "sprout");
      const a = (i / 4) * Math.PI * 2 + 0.4;
      leaf.position.set(Math.cos(a) * 0.12, 0.38, Math.sin(a) * 0.12);
      leaf.rotation.y = -a;
      g.add(leaf);
    }
    g.position.set(0, 1.38, 0.04);
    return g;
  },
  "bell-collar": () => {
    const g = new Group();
    g.add(part(band(0.16, 0.03, 0.05), "pool"));
    const bell = part(new SphereGeometry(0.09, 16, 12), "trim-foil");
    bell.position.set(0, 0.06, 0.8);
    g.add(bell);
    return g;
  },
  "flower-crown": () => {
    const g = new Group();
    const vine = part(new TorusGeometry(0.5, 0.03, 8, 40), "sprout-edge");
    vine.rotation.x = Math.PI / 2;
    g.add(vine);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const flower = new Group();
      for (let k = 0; k < 5; k++) {
        const petal = part(new SphereGeometry(0.055, 10, 8), i % 2 ? "surface" : "pet-blush", false);
        const b = (k / 5) * Math.PI * 2;
        petal.position.set(Math.cos(b) * 0.06, 0.02, Math.sin(b) * 0.06);
        flower.add(petal);
      }
      const centre = part(new SphereGeometry(0.035, 8, 6), "trim-foil", false);
      centre.position.y = 0.05;
      flower.add(centre);
      flower.position.set(Math.cos(a) * 0.5, 0.02, Math.sin(a) * 0.5);
      g.add(flower);
    }
    g.position.set(0, 1.43, 0.04);
    return g;
  },
  // The Market's pieces: the same hand as the rest, a little grander.
  halo: () => {
    const ring = part(new TorusGeometry(0.34, 0.045, 10, 40), "trim-foil");
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, 1.86, 0.04);
    return ring;
  },
  "wizard-hat": () => {
    const g = new Group();
    const brim = part(new CylinderGeometry(0.62, 0.62, 0.05, 32), "pool-edge");
    g.add(brim);
    const cone = part(new ConeGeometry(0.38, 0.92, 28), "pool");
    cone.position.y = 0.48;
    cone.rotation.z = -0.08;
    g.add(cone);
    const shine = part(star(0.1, 0.045, 0.03), "trim-foil", false);
    shine.position.set(0.02, 0.42, 0.33);
    g.add(shine);
    g.position.set(0, 1.42, 0.04);
    g.rotation.z = -0.1;
    return g;
  },
  "sun-hat": () => {
    const g = new Group();
    const brim = part(new CylinderGeometry(0.86, 0.86, 0.045, 36), "pet-cream");
    g.add(brim);
    const crown = dome(0.44, 0.7, "pet-cream");
    g.add(crown);
    const ribbon = part(new CylinderGeometry(0.445, 0.445, 0.1, 32, 1, true), "pet-blush", false);
    (ribbon.material as { side: typeof DoubleSide }).side = DoubleSide;
    ribbon.position.y = 0.07;
    g.add(ribbon);
    g.position.set(0, 1.42, 0.04);
    g.rotation.z = 0.06;
    return g;
  },
  "gold-crown": () => {
    const g = new Group();
    const geometry = new CylinderGeometry(0.36, 0.38, 0.34, 20, 1, true);
    const pos = geometry.getAttribute("position");
    for (let i = 0; i < pos.count; i++) {
      if (pos.getY(i) > 0) {
        const a = Math.atan2(pos.getZ(i), pos.getX(i));
        const k = Math.round(((a + Math.PI) / (Math.PI * 2)) * 10);
        pos.setY(i, 0.17 + (k % 2 ? -0.12 : 0.08));
      }
    }
    geometry.computeVertexNormals();
    const band = part(geometry, "trim-foil");
    (band.material as { side: typeof DoubleSide }).side = DoubleSide;
    g.add(band);
    const gem = part(new SphereGeometry(0.06, 12, 10), "pet-blush");
    gem.position.set(0, 0.0, 0.37);
    g.add(gem);
    g.position.set(0, 1.55, 0.02);
    return g;
  },
  "leaf-sprout": () => {
    const g = new Group();
    const stem = part(new CylinderGeometry(0.02, 0.026, 0.26, 8), "sprout-edge");
    stem.position.y = 0.13;
    g.add(stem);
    for (const side of [-1, 1]) {
      const leaf = blob(0.13, [1, 0.32, 0.6], "sprout");
      leaf.position.set(side * 0.12, 0.28, 0);
      leaf.rotation.z = side * 0.5;
      g.add(leaf);
    }
    g.position.set(0.12, 1.41, 0.12);
    return g;
  },
  // The Market's second shelf.
  "cowboy-hat": () => {
    const g = new Group();
    // A brim whose two sides curl up, under a crown with a sun band.
    const brim = new CylinderGeometry(0.84, 0.84, 0.045, 36);
    const pos = brim.getAttribute("position");
    for (let i = 0; i < pos.count; i++) pos.setY(i, pos.getY(i) + Math.max(0, Math.abs(pos.getX(i)) - 0.42) * 0.5);
    brim.computeVertexNormals();
    g.add(part(brim, "pet-cocoa"));
    const crown = part(new CylinderGeometry(0.34, 0.44, 0.44, 24), "pet-cocoa");
    crown.position.y = 0.23;
    g.add(crown);
    const band = part(new CylinderGeometry(0.44, 0.44, 0.09, 24, 1, true), "sun", false);
    (band.material as { side: typeof DoubleSide }).side = DoubleSide;
    band.position.y = 0.08;
    g.add(band);
    g.position.set(0, 1.42, 0.04);
    g.rotation.z = -0.06;
    return g;
  },
  "chef-hat": () => {
    const g = new Group();
    const band = part(new CylinderGeometry(0.4, 0.42, 0.24, 24), "pet-cloud");
    band.position.y = 0.12;
    g.add(band);
    for (const [x, y, z, r] of [
      [0, 0.46, 0, 0.32],
      [-0.25, 0.36, 0, 0.23],
      [0.25, 0.36, 0, 0.23],
      [0, 0.36, 0.24, 0.21],
      [0, 0.36, -0.24, 0.21],
    ]) {
      const puff = part(new SphereGeometry(r, 16, 12), "pet-cloud");
      puff.position.set(x, y, z);
      g.add(puff);
    }
    g.position.set(0, 1.4, 0.02);
    return g;
  },
  sunglasses: () => {
    const g = new Group();
    for (const side of [-1, 1]) {
      const lens = part(new CylinderGeometry(0.13, 0.13, 0.03, 24), "edge");
      lens.rotation.x = Math.PI / 2;
      lens.scale.set(1.18, 1, 0.92);
      lens.position.set(side * EYES.x, EYES.y, EYES.z + 0.03);
      g.add(lens);
      const arm = part(new CylinderGeometry(0.015, 0.015, 0.2, 6), "edge", false);
      arm.rotation.z = Math.PI / 2;
      arm.position.set(side * (EYES.x + 0.24), EYES.y + 0.03, EYES.z + 0.02);
      g.add(arm);
    }
    const bridge = part(new CylinderGeometry(0.018, 0.018, EYES.x * 2 - 0.28, 6), "edge", false);
    bridge.rotation.z = Math.PI / 2;
    bridge.position.set(0, EYES.y + 0.05, EYES.z + 0.03);
    g.add(bridge);
    return g;
  },
  headphones: () => {
    const g = new Group();
    // A band over the crown from one side of the head to the other, a cup on each.
    const band = part(new TorusGeometry(0.7, 0.05, 8, 36, Math.PI), "pool");
    band.position.y = 0.8;
    g.add(band);
    for (const side of [-1, 1]) {
      const cup = part(new CylinderGeometry(0.2, 0.2, 0.16, 20), "pool-edge");
      cup.rotation.z = Math.PI / 2;
      cup.position.set(side * 0.7, 0.8, 0);
      g.add(cup);
    }
    return g;
  },
  beret: () => {
    const g = new Group();
    const cap = part(new SphereGeometry(0.52, 24, 12), "sun-edge");
    cap.scale.set(1, 0.28, 1);
    g.add(cap);
    const stem = part(new CylinderGeometry(0.025, 0.03, 0.12, 8), "edge", false);
    stem.position.y = 0.17;
    g.add(stem);
    g.position.set(0.08, 1.46, 0.02);
    g.rotation.z = -0.22;
    return g;
  },
  necktie: () => {
    const g = new Group();
    const knot = part(new BoxGeometry(0.11, 0.08, 0.05), "pool-edge");
    knot.position.set(0, 0.36, 0.73);
    g.add(knot);
    const s = new Shape();
    s.moveTo(-0.045, 0);
    s.lineTo(0.045, 0);
    s.lineTo(0.08, -0.2);
    s.lineTo(0, -0.28);
    s.lineTo(-0.08, -0.2);
    s.closePath();
    const blade = part(new ExtrudeGeometry(s, { depth: 0.025, bevelEnabled: false }), "pool");
    blade.position.set(0, 0.33, 0.71);
    g.add(blade);
    return g;
  },
} satisfies Record<string, () => Object3D>);

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
