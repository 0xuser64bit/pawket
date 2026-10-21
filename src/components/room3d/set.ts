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
  Vector2,
  type BufferGeometry,
  type MeshToonMaterial,
} from "three";
import type { Sky } from "@/components/pk";
import { AUTUMN, DECOR_SLOTS, type DecorSlot, type RoomDecor } from "@/lib/room/decor";
import { SLOT_AT, buildDecor, type BuiltDecor } from "./decor";
import { addOutline, disposeTree, toon } from "./materials";
import { DAYLIGHT, type Tone } from "./palette";

const BACK = -1.6;
export const BED = { x: SLOT_AT.bed.x, z: SLOT_AT.bed.z };

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

export interface RoomSet {
  group: Group;
  light: (evening: boolean, wall: string) => void;
  dress: (decor: RoomDecor) => void;
  tick: (now: Date) => void;
  window: { x: number; y: number; z: number };
}

export function buildRoom(decor?: RoomDecor): RoomSet {
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

  const line = new Mesh(new BoxGeometry(12, 0.03, 0.03), new MeshBasicMaterial({ color: DAYLIGHT.edge }));
  line.position.set(0, 0.012, BACK + 0.012);
  group.add(line);
  const lineMaterial = line.material as MeshBasicMaterial;

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

  const leafShape = new Shape();
  leafShape.moveTo(0, -0.035);
  leafShape.quadraticCurveTo(0.028, -0.005, 0, 0.035);
  leafShape.quadraticCurveTo(-0.028, -0.005, 0, -0.035);
  const leafGeometry = new ExtrudeGeometry(leafShape, { depth: 0.002, bevelEnabled: false });
  const leaves = (["sun", "sun-edge", "trim-copper", "trim-foil", "sun", "sun-edge"] as const).map((tone) => {
    const leaf = new Mesh(leafGeometry, new MeshBasicMaterial({ color: DAYLIGHT[tone] }));
    leaf.name = "leaf";
    leaf.visible = false;
    group.add(leaf);
    return leaf;
  });
  const glassTop = win.y + 0.06 + 0.84;
  const glassBottom = win.y + 0.06;

  const places = {} as Record<DecorSlot, { group: Group; id: string | null; built: BuiltDecor | null }>;
  for (const slot of DECOR_SLOTS) {
    const place = new Group();
    place.name = `decor:${slot}`;
    place.position.set(SLOT_AT[slot].x, SLOT_AT[slot].y, SLOT_AT[slot].z);
    group.add(place);
    places[slot] = { group: place, id: null, built: null };
  }
  let dark = false;
  const dress = (decor: RoomDecor) => {
    for (const slot of DECOR_SLOTS) {
      const place = places[slot];
      const id = decor[slot];
      if (place.id === id) continue;
      if (place.built) {
        place.group.remove(place.built.object);
        disposeTree(place.built.object);
      }
      place.id = id;
      place.built = id ? buildDecor(id) : null;
      if (place.built) {
        place.group.add(place.built.object);
        place.built.evening?.(dark);
      }
    }
  };
  const tick = (now: Date) => {
    for (const slot of DECOR_SLOTS) places[slot].built?.tick?.(now);
    const autumn = AUTUMN.has(now.getMonth());
    const t = now.getTime() / 1000;
    leaves.forEach((leaf, i) => {
      leaf.visible = autumn;
      if (!autumn) return;
      const fall = (t / (7 + i) + i / leaves.length) % 1;
      leaf.position.set(
        win.x - 0.34 + (i / (leaves.length - 1)) * 0.68 + Math.sin(t * 1.3 + i * 2) * 0.05,
        glassTop + 0.05 - fall * (glassTop - glassBottom + 0.1),
        win.z + 0.012,
      );
      leaf.rotation.z = t * (0.8 + i * 0.1) + i;
    });
  };
  if (decor) dress(decor);

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

  const hemi = new HemisphereLight(0xfff4e6, 0xcab89c, 1.6);
  const sun = new DirectionalLight(0xfff0dc, 2.2);
  sun.position.set(-3, 4.5, 4);
  const fill = new AmbientLight(0xffffff, 0.35);
  const lamp = new PointLight(0xffb070, 0, 7, 1.4);
  lamp.position.set(1.45, 1.9, -0.55);
  group.add(hemi, sun, sun.target, fill, lamp);

  const light = (evening: boolean, wall: string) => {
    dark = evening;
    for (const slot of DECOR_SLOTS) places[slot].built?.evening?.(evening);
    wallMaterial.color.set(evening ? DAYLIGHT["surface-sunk"] : wall);
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
  light(false, DAYLIGHT[SKY_TONE.warm]);

  return { group, light, dress, tick, window: { x: win.x, y: win.y + 0.5, z: win.z } };
}

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
