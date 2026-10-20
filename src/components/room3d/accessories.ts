import {
  CylinderGeometry,
  ConeGeometry,
  ExtrudeGeometry,
  Group,
  Mesh,
  Shape,
  SphereGeometry,
  TorusGeometry,
  Vector3,
  type BufferGeometry,
} from "three";
import type { PlayerLook } from "@/lib/player/look";
import { addOutline, toon } from "./materials";
import { clothHex, DAYLIGHT, type Tone } from "./palette";

/**
 * What the player wears on the head and on the nose, built in the Head
 * joint's own space (metres, +Y up the skull, +Z out of the face) and hung
 * from it, so it turns and nods with the head. The eyes are the measure:
 * glasses sit on them and a hat sits a skull's height above them. Looks
 * only, like everything the player wears.
 */

function part(geometry: BufferGeometry, colour: string, outline = true): Mesh {
  const mesh = new Mesh(geometry, toon({ color: colour }));
  if (outline) addOutline(mesh);
  return mesh;
}

const tone = (name: Tone) => DAYLIGHT[name];

function star(size: number, depth: number): ExtrudeGeometry {
  const s = new Shape();
  for (let k = 0; k < 10; k++) {
    const a = Math.PI / 2 + (k * Math.PI) / 5;
    const r = k % 2 ? size * 0.45 : size;
    if (k) s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    else s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  return new ExtrudeGeometry(s, { depth, bevelEnabled: false });
}

function heart(size: number, depth: number): ExtrudeGeometry {
  const s = new Shape();
  s.moveTo(0, -size);
  s.bezierCurveTo(-size * 1.3, -size * 0.1, -size * 0.7, size, 0, size * 0.45);
  s.bezierCurveTo(size * 0.7, size, size * 1.3, -size * 0.1, 0, -size);
  return new ExtrudeGeometry(s, { depth, bevelEnabled: false });
}

/** The rims and arms every pair of glasses shares, around the two eyes. */
function frames(eyes: { l: Vector3; r: Vector3 }, lens: (side: Vector3) => Mesh, rim: string): Group {
  const g = new Group();
  for (const eye of [eyes.l, eyes.r]) {
    const piece = lens(eye);
    piece.position.copy(eye).add(new Vector3(0, 0, 0.034));
    g.add(piece);
    const side = Math.sign(eye.x) || 1;
    const arm = part(new CylinderGeometry(0.0035, 0.0035, 0.1, 6), rim, false);
    arm.rotation.x = Math.PI / 2;
    arm.position.set(eye.x + side * 0.03, eye.y + 0.004, eye.z - 0.015);
    g.add(arm);
  }
  const span = Math.abs(eyes.l.x - eyes.r.x) - 0.05;
  const bridge = part(new CylinderGeometry(0.0035, 0.0035, Math.max(0.01, span), 6), rim, false);
  bridge.rotation.z = Math.PI / 2;
  bridge.position.set((eyes.l.x + eyes.r.x) / 2, eyes.l.y + 0.006, eyes.l.z + 0.036);
  g.add(bridge);
  return g;
}

const EYEWEAR: Record<Exclude<PlayerLook["eyewear"], "none">, (eyes: { l: Vector3; r: Vector3 }) => Group> = {
  round: (eyes) => frames(eyes, () => part(new TorusGeometry(0.027, 0.0045, 8, 24), tone("edge"), false), tone("edge")),
  hearts: (eyes) =>
    frames(
      eyes,
      () => {
        const lens = part(heart(0.024, 0.006), tone("pet-blush"));
        lens.position.z -= 0.003;
        return lens;
      },
      tone("pet-blush"),
    ),
  stars: (eyes) =>
    frames(
      eyes,
      () => {
        const lens = part(star(0.03, 0.006), tone("sun"));
        lens.position.z -= 0.003;
        return lens;
      },
      tone("sun-edge"),
    ),
  shades: (eyes) =>
    frames(
      eyes,
      () => {
        const lens = part(new CylinderGeometry(0.029, 0.029, 0.006, 20), tone("edge"), false);
        lens.rotation.x = Math.PI / 2;
        lens.scale.set(1.15, 1, 0.8);
        return lens;
      },
      tone("edge"),
    ),
};

/** A dome over the crown, for a cap or a beanie. */
function dome(radius: number, squash: number, colour: string): Mesh {
  const mesh = part(new SphereGeometry(radius, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), colour);
  mesh.scale.set(1.04, squash, 1.1);
  return mesh;
}

const HEADWEAR: Record<Exclude<PlayerLook["headwear"], "none">, (crown: number, colour: string) => Group> = {
  beanie: (crown, colour) => {
    const g = new Group();
    const cap = dome(0.108, 0.9, colour);
    cap.position.y = crown;
    g.add(cap);
    const cuff = part(new CylinderGeometry(0.114, 0.116, 0.032, 24), colour);
    cuff.position.y = crown + 0.008;
    g.add(cuff);
    const pompom = part(new SphereGeometry(0.03, 12, 10), tone("ink-inverse"));
    pompom.position.y = crown + 0.105;
    g.add(pompom);
    return g;
  },
  cap: (crown, colour) => {
    const g = new Group();
    const cap = dome(0.106, 0.72, colour);
    cap.position.y = crown;
    g.add(cap);
    const brim = part(new CylinderGeometry(0.075, 0.075, 0.008, 20, 1, false, -Math.PI / 2, Math.PI), colour);
    brim.position.set(0, crown + 0.004, 0.09);
    brim.scale.set(1, 1, 1.2);
    g.add(brim);
    return g;
  },
  party: (crown, colour) => {
    const g = new Group();
    const cone = part(new ConeGeometry(0.052, 0.14, 20), colour);
    cone.position.y = 0.07;
    g.add(cone);
    const pompom = part(new SphereGeometry(0.018, 10, 8), tone("trim-foil"));
    pompom.position.y = 0.145;
    g.add(pompom);
    g.position.set(0.02, crown + 0.07, 0.01);
    g.rotation.z = -0.22;
    return g;
  },
  flower: (crown, colour) => {
    const g = new Group();
    for (let k = 0; k < 5; k++) {
      const petal = part(new SphereGeometry(0.016, 10, 8), colour, false);
      const a = (k / 5) * Math.PI * 2;
      petal.position.set(Math.cos(a) * 0.018, Math.sin(a) * 0.018, 0);
      g.add(petal);
    }
    const centre = part(new SphereGeometry(0.011, 8, 6), tone("trim-foil"), false);
    centre.position.z = 0.008;
    g.add(centre);
    g.position.set(0.075, crown + 0.02, 0.05);
    g.rotation.y = 0.9;
    return g;
  },
  bow: (crown, colour) => {
    // A big bow worn to one side of the crown: two loops and a knot.
    const g = new Group();
    for (const side of [-1, 1]) {
      const loop = part(new SphereGeometry(0.05, 16, 12), colour);
      loop.scale.set(1.2, 0.8, 0.45);
      loop.position.x = side * 0.052;
      loop.rotation.z = side * 0.35;
      g.add(loop);
    }
    g.add(part(new SphereGeometry(0.022, 12, 10), colour));
    g.position.set(0.05, crown + 0.03, 0.03);
    g.rotation.set(-0.25, 0, -0.4);
    return g;
  },
  cat: (crown, colour) => {
    // A headband with two pointed ears, their insides blush, like the pet's own.
    const g = new Group();
    const band = part(new TorusGeometry(0.104, 0.008, 6, 32, Math.PI), colour);
    band.position.y = crown - 0.02;
    g.add(band);
    for (const side of [-1, 1]) {
      const ear = part(new ConeGeometry(0.036, 0.07, 4), colour);
      ear.scale.set(1, 1, 0.45);
      ear.position.set(side * 0.055, crown + 0.085, 0);
      ear.rotation.z = side * -0.45;
      g.add(ear);
      const inner = part(new ConeGeometry(0.02, 0.04, 4), tone("pet-blush"), false);
      inner.scale.set(1, 1, 0.3);
      inner.position.set(side * 0.055, crown + 0.08, 0.009);
      inner.rotation.z = side * -0.45;
      g.add(inner);
    }
    return g;
  },
  headphones: (crown, colour) => {
    // A band from ear to ear over the crown, and a cup on each ear.
    const g = new Group();
    const ears = crown - 0.085;
    const band = part(new TorusGeometry(0.114, 0.011, 8, 36, Math.PI), colour);
    band.position.y = ears;
    band.scale.y = 0.9;
    g.add(band);
    for (const side of [-1, 1]) {
      const cup = part(new CylinderGeometry(0.038, 0.038, 0.034, 20), colour);
      cup.rotation.z = Math.PI / 2;
      cup.position.set(side * 0.114, ears, 0);
      g.add(cup);
      const pad = part(new CylinderGeometry(0.026, 0.026, 0.01, 16), tone("edge"), false);
      pad.rotation.z = Math.PI / 2;
      pad.position.set(side * 0.134, ears, 0);
      g.add(pad);
    }
    return g;
  },
  bunny: (crown, colour) => {
    const g = new Group();
    const band = part(new TorusGeometry(0.104, 0.008, 6, 32, Math.PI), colour);
    band.position.y = crown - 0.02;
    g.add(band);
    for (const side of [-1, 1]) {
      const ear = part(new SphereGeometry(0.03, 14, 10), colour);
      ear.scale.set(0.8, 2.4, 0.45);
      ear.position.set(side * 0.045, crown + 0.13, -0.01);
      ear.rotation.z = side * -0.18;
      g.add(ear);
      const inner = part(new SphereGeometry(0.018, 10, 8), tone("pet-blush"), false);
      inner.scale.set(0.8, 2.6, 0.3);
      inner.position.set(side * 0.045, crown + 0.13, 0.004);
      inner.rotation.z = side * -0.18;
      g.add(inner);
    }
    return g;
  },
};

/**
 * The player's hat and glasses, ready to hang from the Head joint. `eyes`
 * are the eye joints' positions in the same space; a body brings its own.
 */
export function accessoriesFor(look: PlayerLook, eyes: { l: Vector3; r: Vector3 }): Group {
  const g = new Group();
  g.name = "accessory";
  const crown = (eyes.l.y + eyes.r.y) / 2 + 0.085;
  if (look.headwear !== "none") g.add(HEADWEAR[look.headwear](crown, clothHex(look.headwearColour)));
  if (look.eyewear !== "none") g.add(EYEWEAR[look.eyewear](eyes));
  return g;
}
