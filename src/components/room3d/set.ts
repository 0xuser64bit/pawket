import {
  AmbientLight,
  BoxGeometry,
  CircleGeometry,
  Color,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  PointLight,
  Shape,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  type BufferGeometry,
  type MeshToonMaterial,
} from "three";
import type { Sky } from "@/components/pk";
import { addOutline, toon } from "./materials";
import { DAYLIGHT, type Tone } from "./palette";

/**
 * The room: the flat Home room from the design system, built as a
 * diorama. A back wall in the pet's sky tint, a window with its mullion,
 * a floor meeting the wall on an ink line, and the lantern the evening
 * lights. The furniture stays where it is when the evening comes; only
 * the light changes.
 *
 * Room space: metres, floor at y = 0, back wall at z = BACK, camera on +Z.
 */

export const BACK = -1.6;
export const BED = { x: 1.55, z: -0.72 };

const SKY_TONE: Record<Sky, Tone> = { warm: "sun-soft", cool: "pool-soft", plain: "surface-sunk" };

function solid(geometry: BufferGeometry, tone: Tone, outline = true): Mesh {
  const mesh = new Mesh(geometry, toon({ color: DAYLIGHT[tone] }));
  if (outline) addOutline(mesh);
  return mesh;
}

function roundedTop(width: number, height: number, radius: number): Shape {
  const s = new Shape();
  const w = width / 2;
  s.moveTo(-w, 0);
  s.lineTo(w, 0);
  s.lineTo(w, height - radius);
  s.quadraticCurveTo(w, height, w - radius, height);
  s.lineTo(-w + radius, height);
  s.quadraticCurveTo(-w, height, -w, height - radius);
  s.closePath();
  return s;
}

function roundedRect(width: number, depth: number, radius: number): Shape {
  const s = new Shape();
  const w = width / 2;
  const d = depth / 2;
  s.moveTo(-w + radius, -d);
  s.lineTo(w - radius, -d);
  s.quadraticCurveTo(w, -d, w, -d + radius);
  s.lineTo(w, d - radius);
  s.quadraticCurveTo(w, d, w - radius, d);
  s.lineTo(-w + radius, d);
  s.quadraticCurveTo(-w, d, -w, d - radius);
  s.lineTo(-w, -d + radius);
  s.quadraticCurveTo(-w, -d, -w + radius, -d);
  return s;
}

export interface RoomSet {
  group: Group;
  /** Evening or day, and the pet's sky on the wall. */
  light: (evening: boolean, sky: Sky) => void;
  window: { x: number; y: number; z: number };
}

export function buildRoom(): RoomSet {
  const group = new Group();
  group.name = "room";

  const wallMaterial = toon({ color: DAYLIGHT["sun-soft"] });
  const wall = new Mesh(new PlaneGeometry(12, 5), wallMaterial);
  wall.position.set(0, 2.5, BACK);
  group.add(wall);

  const floor = new Mesh(new PlaneGeometry(12, 7), toon({ color: DAYLIGHT["surface-sunk"] }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, BACK + 3.5);
  group.add(floor);

  // Where wall meets floor: the ink line the flat room draws.
  const line = new Mesh(new BoxGeometry(12, 0.03, 0.03), new MeshBasicMaterial({ color: DAYLIGHT.edge }));
  line.position.set(0, 0.012, BACK + 0.012);
  group.add(line);
  const lineMaterial = line.material as MeshBasicMaterial;

  // The window: rounded at the top like `radius-md`, a mullion down the middle.
  const win = { x: -1.2, y: 0.98, z: BACK };
  const frameShape = roundedTop(1.02, 0.96, 0.16);
  frameShape.holes.push(new Shape(roundedTop(0.9, 0.84, 0.11).getPoints().map((p) => p.add(new Vector2(0, 0.06)))));
  const frame = solid(new ExtrudeGeometry(frameShape, { depth: 0.06, bevelEnabled: false }), "surface");
  frame.position.set(win.x, win.y, win.z);
  group.add(frame);
  const skyMaterial = new MeshBasicMaterial({ color: DAYLIGHT["pool-soft"] });
  const glass = new Mesh(new ExtrudeGeometry(roundedTop(0.9, 0.84, 0.11), { depth: 0.005, bevelEnabled: false }), skyMaterial);
  glass.position.set(win.x, win.y + 0.06, win.z + 0.002);
  group.add(glass);
  const disc = new Mesh(new CircleGeometry(0.1, 28), new MeshBasicMaterial({ color: DAYLIGHT["ink-inverse"] }));
  disc.position.set(win.x + 0.22, win.y + 0.66, win.z + 0.012);
  group.add(disc);
  const mullion = new Mesh(new BoxGeometry(0.03, 0.84, 0.03), new MeshBasicMaterial({ color: DAYLIGHT.edge }));
  mullion.position.set(win.x, win.y + 0.48, win.z + 0.03);
  group.add(mullion);
  const sill = solid(new BoxGeometry(1.14, 0.05, 0.14), "surface");
  sill.position.set(win.x, win.y - 0.02, win.z + 0.07);
  group.add(sill);

  // A rug under the two of them.
  const rug = solid(new ExtrudeGeometry(roundedRect(2.7, 1.6, 0.4), { depth: 0.012, bevelEnabled: false }), "sprout-soft");
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0.05, 0.001, 0.32);
  group.add(rug);

  // The pet's cushion, where a nap happens.
  const bed = new Group();
  bed.add(solid(new TorusGeometry(0.34, 0.09, 12, 28), "sun"));
  bed.children[0].rotation.x = -Math.PI / 2;
  bed.children[0].position.y = 0.08;
  const pad = solid(new CylinderGeometry(0.34, 0.36, 0.08, 28), "sun-soft");
  pad.position.y = 0.04;
  bed.add(pad);
  bed.position.set(BED.x, 0, BED.z);
  group.add(bed);

  // A plant in the corner by the window.
  const plant = new Group();
  const pot = solid(new CylinderGeometry(0.16, 0.12, 0.3, 20), "trim-copper");
  pot.position.y = 0.15;
  plant.add(pot);
  for (const [x, y, z, rx, rz, s] of [
    [0, 0.55, 0, 0, 0, 1],
    [-0.12, 0.46, 0.04, 0.2, 0.55, 0.85],
    [0.13, 0.48, -0.02, -0.1, -0.6, 0.85],
    [0.02, 0.44, 0.12, 0.6, 0.1, 0.75],
  ]) {
    const leaf = solid(new SphereGeometry(0.12, 14, 10), "sprout");
    leaf.scale.set(0.55 * s, 1.5 * s, 0.35 * s);
    leaf.position.set(x, y, z);
    leaf.rotation.set(rx, 0, rz);
    plant.add(leaf);
  }
  plant.position.set(-2.2, 0, BACK + 0.45);
  group.add(plant);

  // A shelf with three books.
  const shelf = new Group();
  shelf.add(solid(new BoxGeometry(0.9, 0.05, 0.22), "surface"));
  for (const [x, h, w, tone, tilt] of [
    [-0.28, 0.3, 0.07, "pool", 0],
    [-0.19, 0.26, 0.08, "sun", 0],
    [-0.1, 0.28, 0.06, "sprout", 0],
    [0.02, 0.24, 0.07, "trim-glass", -0.28],
  ] as const) {
    const book = solid(new BoxGeometry(w, h, 0.17), tone);
    book.position.set(x, 0.025 + h / 2, 0);
    book.rotation.z = tilt;
    shelf.add(book);
  }
  shelf.position.set(0.85, 1.52, BACK + 0.12);
  group.add(shelf);

  // The lantern, hung from above the frame; lit in the evening.
  const lantern = new Group();
  const cord = new Mesh(new CylinderGeometry(0.008, 0.008, 1.2, 6), new MeshBasicMaterial({ color: DAYLIGHT.edge }));
  cord.position.y = 0.6;
  lantern.add(cord);
  const shade = solid(new SphereGeometry(0.2, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), "sun");
  (shade.material as MeshToonMaterial).side = DoubleSide;
  lantern.add(shade);
  const bulbMaterial = toon({ color: DAYLIGHT["sun-soft"] });
  const bulb = new Mesh(new SphereGeometry(0.07, 16, 12), bulbMaterial);
  bulb.position.y = -0.02;
  lantern.add(bulb);
  lantern.position.set(1.45, 2.02, -0.55);
  group.add(lantern);

  // Light. Day comes through the window; evening is the lantern.
  const hemi = new HemisphereLight(0xfff4e6, 0xcab89c, 1.6);
  const sun = new DirectionalLight(0xfff0dc, 2.2);
  sun.position.set(-3, 4.5, 4);
  const fill = new AmbientLight(0xffffff, 0.35);
  const lamp = new PointLight(0xffb070, 0, 7, 1.4);
  lamp.position.set(1.45, 1.9, -0.55);
  group.add(hemi, sun, sun.target, fill, lamp);

  const light = (evening: boolean, sky: Sky) => {
    wallMaterial.color.set(DAYLIGHT[evening ? "surface-sunk" : SKY_TONE[sky]]);
    skyMaterial.color.set(evening ? DAYLIGHT["pool-edge"] : DAYLIGHT["pool-soft"]);
    (disc.material as MeshBasicMaterial).color.set(evening ? DAYLIGHT["sun-soft"] : DAYLIGHT["ink-inverse"]);
    disc.scale.setScalar(evening ? 0.7 : 1);
    hemi.intensity = evening ? 0.55 : 1.6;
    hemi.color.set(evening ? 0x8ea3d8 : 0xfff4e6);
    hemi.groundColor.set(evening ? 0x2a1e14 : 0xcab89c);
    sun.intensity = evening ? 0.45 : 2.2;
    sun.color.set(evening ? 0x9fb6ff : 0xfff0dc);
    sun.position.set(evening ? -1.4 : -3, evening ? 2.4 : 4.5, evening ? -1.2 : 4);
    fill.intensity = evening ? 0.12 : 0.35;
    lamp.intensity = evening ? 9 : 0;
    bulbMaterial.emissive = new Color(evening ? DAYLIGHT.sun : 0x000000);
    bulbMaterial.emissiveIntensity = evening ? 1.4 : 0;
    lineMaterial.color.set(DAYLIGHT.edge);
  };
  light(false, "warm");

  return { group, light, window: { x: win.x, y: win.y + 0.5, z: win.z } };
}

/** A flat, hard-edged shadow: offset and outline, never blur. */
export function blobShadow(radius: number): Mesh {
  const mesh = new Mesh(
    new CircleGeometry(radius, 32),
    new MeshBasicMaterial({ color: DAYLIGHT.edge, transparent: true, opacity: 0.14, depthWrite: false }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.014;
  mesh.renderOrder = 1;
  return mesh;
}
