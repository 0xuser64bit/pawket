/**
 * The human pack ships without a single animation, so the room's clips are
 * authored here and baked onto each body's own rest pose.
 *
 * A clip is a list of key poses. A pose says what an animator would say:
 * where the pelvis goes, how the spine and head turn, where each hand and
 * foot should be (two-bone IK with a pole for the elbow or knee), which way
 * a palm faces, how far the fingers curl. Keys are eased into each other and
 * `wobble(t)` adds continuous motion on top (breath, the wave itself, a
 * dance bounce). The baker samples at 30 fps, solves the IK and writes a
 * plain glTF animation — local rotations per joint, pelvis translation —
 * that any glTF player can run, and that the runtime crossfades.
 *
 * Space: the body's bind space. Y up, metres, facing +Z, the body's left on
 * +X. A rotation `[x, y, z]` is in degrees about those axes, applied at the
 * joint in its rest pose and carried by its parents (y turns left, x bends
 * forward, z tips toward -X). A hand target is an offset from its shoulder
 * as posed, a foot target an offset from its ankle at rest; with `abs` set
 * either is a point in bind space, and with `from` a hand target is an
 * offset from that joint at rest.
 */
import { Matrix4, Quaternion, Vector3 } from "three";

const DEG = Math.PI / 180;
const FPS = 30;

/* ------------------------------------------------------------------ rig */

/**
 * The rest skeleton of one body: hierarchy, rest local transforms and rest
 * world transforms, keyed by joint name.
 */
export function rigFrom(rootJoint) {
  const bones = new Map();
  const walk = (node, parent) => {
    const t = new Vector3(...node.getTranslation());
    const r = new Quaternion(...node.getRotation());
    const local = new Matrix4().compose(t, r, new Vector3(1, 1, 1));
    const world = parent ? parent.world.clone().multiply(local) : local.clone();
    const bone = {
      name: node.getName(),
      node,
      parent,
      children: [],
      t,
      r,
      world,
      worldR: new Quaternion().setFromRotationMatrix(world),
      worldP: new Vector3().setFromMatrixPosition(world),
    };
    bones.set(bone.name, bone);
    parent?.children.push(bone);
    for (const child of node.listChildren()) walk(child, bone);
  };
  walk(rootJoint, null);
  const order = [...bones.values()];
  return { bones, order, get: (name) => bones.get(name) };
}

/* ------------------------------------------------------------ pose maths */

const euler = ([x = 0, y = 0, z = 0]) =>
  new Quaternion()
    .setFromAxisAngle(new Vector3(0, 1, 0), y * DEG)
    .multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), x * DEG))
    .multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), z * DEG));

/** Rotation taking basis (a0, h0) to (a1, h1): bone axis and hinge axis. */
function basisRotation(a0, h0, a1, h1) {
  const frame = (a, h) => {
    const x = a.clone().normalize();
    const y = h.clone().sub(x.clone().multiplyScalar(h.dot(x))).normalize();
    const z = x.clone().cross(y);
    return new Matrix4().makeBasis(x, y, z);
  };
  const m = frame(a1, h1).multiply(frame(a0, h0).invert());
  return new Quaternion().setFromRotationMatrix(m);
}

/** Elbow or knee for a two-bone chain from `s` to `t`, bending toward `pole`. */
function twoBone(s, t, l1, l2, pole) {
  const d = t.clone().sub(s);
  const dist = Math.min(Math.max(d.length(), Math.abs(l1 - l2) + 1e-4), l1 + l2 - 1e-4);
  const dir = d.normalize();
  const cosA = (l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist);
  const sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
  let p = pole.clone().sub(dir.clone().multiplyScalar(pole.dot(dir)));
  if (p.lengthSq() < 1e-8) p = new Vector3(0, 0, 1).cross(dir);
  p.normalize();
  const mid = s.clone().add(dir.clone().multiplyScalar(l1 * cosA)).add(p.clone().multiplyScalar(l1 * sinA));
  const end = s.clone().add(dir.clone().multiplyScalar(dist));
  return { mid, end, bendAway: p.clone().negate() };
}

const ARM = { l: 1, r: -1 };

/**
 * Solve one pose to local joint rotations (and the pelvis translation) on
 * this rig. Returns Map(name → { r: Quaternion, t?: Vector3 }).
 */
function solve(rig, pose) {
  const out = new Map();
  const world = new Map(); // name → { R: Quaternion, P: Vector3 }

  const place = (bone, localR, localT = bone.t) => {
    const parent = bone.parent ? world.get(bone.parent.name) : { R: new Quaternion(), P: new Vector3() };
    const R = parent.R.clone().multiply(localR);
    const P = localT.clone().applyQuaternion(parent.R).add(parent.P);
    world.set(bone.name, { R, P });
    out.set(bone.name, { r: localR, t: localT === bone.t ? undefined : localT });
  };
  /** Local rotation that gives the bone world rotation `R`. */
  const localFor = (bone, R) => world.get(bone.parent.name).R.clone().invert().multiply(R);
  /** A rest-frame delta, carried by the parent. */
  const withDelta = (bone, D) => bone.r.clone().multiply(bone.worldR.clone().invert().multiply(D).multiply(bone.worldR));
  /** World rotation that points the bone along `axis` with its hinge on `hinge`. */
  const aimed = (bone, restHinge, axis, hinge) => {
    const restAxis = bone.children.length
      ? bone.children[0].worldP.clone().sub(bone.worldP).normalize()
      : new Vector3(0, 1, 0).applyQuaternion(bone.worldR);
    return basisRotation(restAxis, restHinge, axis, hinge).multiply(bone.worldR);
  };

  // Limb targets resolved once their root joint is placed.
  const ik = {};
  for (const bone of rig.order) {
    const name = bone.name;
    const side = name.endsWith("_l") ? "l" : name.endsWith("_r") ? "r" : null;

    if (name === "pelvis") {
      const P = bone.worldP.clone().add(new Vector3(...(pose.pelvis?.at ?? [0, 0, 0])));
      const parent = world.get(bone.parent.name);
      const localT = P.clone().sub(parent.P).applyQuaternion(parent.R.clone().invert());
      place(bone, withDelta(bone, euler(pose.pelvis?.rot ?? [])), localT);
      continue;
    }

    if (/^upperarm_[lr]$/.test(name) && pose[`hand_${side}`]) {
      const spec = pose[`hand_${side}`];
      const fore = bone.children.find((c) => c.name.startsWith("lowerarm"));
      const hand = fore.children.find((c) => c.name.startsWith("hand"));
      const parent = world.get(bone.parent.name);
      const s = bone.t.clone().applyQuaternion(parent.R).add(parent.P);
      const origin = spec.from ? rig.get(spec.from).worldP : spec.abs ? new Vector3() : s;
      const target = origin.clone().add(new Vector3(...spec.at));
      const l1 = fore.t.length();
      const l2 = hand.t.length();
      const { mid, end, bendAway } = twoBone(s, target, l1, l2, new Vector3(...(spec.pole ?? [0.3 * ARM[side], -0.4, -1])));
      // Rest hinge: the axis the elbow flexes about in the T-pose.
      const restHinge = new Vector3(ARM[side], 0, 0).cross(new Vector3(0, 0, 1));
      const upperDir = mid.clone().sub(s).normalize();
      const foreDir = end.clone().sub(mid).normalize();
      let hinge = upperDir.clone().cross(foreDir);
      if (hinge.lengthSq() < 1e-6) hinge = upperDir.clone().cross(bendAway);
      hinge.normalize();
      ik[side] = { foreDir, hinge, restHinge, spec };
      place(bone, localFor(bone, aimed(bone, restHinge, upperDir, hinge)));
      continue;
    }
    if (/^lowerarm_[lr]$/.test(name) && ik[side]) {
      const { foreDir, hinge, restHinge } = ik[side];
      place(bone, localFor(bone, aimed(bone, restHinge, foreDir, hinge)));
      continue;
    }
    if (/^hand_[lr]$/.test(name) && ik[side]?.spec.point) {
      // Fingers along `point`, palm facing `palm`.
      const { spec } = ik[side];
      const restPalm = new Vector3(0, -1, 0);
      const R = basisRotation(
        new Vector3(ARM[side], 0, 0),
        restPalm,
        new Vector3(...spec.point).normalize(),
        new Vector3(...(spec.palm ?? [0, -1, 0])).normalize(),
      ).multiply(bone.worldR);
      place(bone, localFor(bone, R));
      continue;
    }

    if (/^thigh_[lr]$/.test(name) && pose[`foot_${side}`]) {
      const spec = pose[`foot_${side}`];
      const calf = bone.children[0];
      const foot = calf.children[0];
      const parent = world.get(bone.parent.name);
      const s = bone.t.clone().applyQuaternion(parent.R).add(parent.P);
      const target = spec.abs ? new Vector3(...spec.at) : foot.worldP.clone().add(new Vector3(...(spec.at ?? [0, 0, 0])));
      const { mid, end, bendAway } = twoBone(s, target, calf.t.length(), foot.t.length(), new Vector3(...(spec.pole ?? [0, 0, 1])));
      const restHinge = new Vector3(1, 0, 0);
      const upperDir = mid.clone().sub(s).normalize();
      const lowerDir = end.clone().sub(mid).normalize();
      let hinge = upperDir.clone().cross(lowerDir);
      if (hinge.lengthSq() < 1e-6) hinge = upperDir.clone().cross(bendAway);
      hinge.normalize();
      // Knees point where the pole says even when the leg is straight.
      if (hinge.dot(new Vector3(1, 0, 0)) < 0) hinge.negate();
      ik[`leg_${side}`] = { lowerDir, hinge, restHinge, spec };
      place(bone, localFor(bone, aimed(bone, restHinge, upperDir, hinge)));
      continue;
    }
    if (/^calf_[lr]$/.test(name) && ik[`leg_${side}`]) {
      const { lowerDir, hinge, restHinge } = ik[`leg_${side}`];
      place(bone, localFor(bone, aimed(bone, restHinge, lowerDir, hinge)));
      continue;
    }
    if (/^foot_[lr]$/.test(name) && ik[`leg_${side}`]) {
      // Feet keep their rest heading; `pitch` lifts the heel (+) or toes.
      const { spec } = ik[`leg_${side}`];
      const R = euler([spec.pitch ?? 0, spec.turn ?? 0, 0]).multiply(bone.worldR);
      place(bone, localFor(bone, R));
      continue;
    }
    if (/^ball_[lr]$/.test(name) && pose[`foot_${side}`]?.toes) {
      place(bone, withDelta(bone, euler([-pose[`foot_${side}`].toes, 0, 0])));
      continue;
    }

    // Fingers: curl bends every finger segment toward the palm.
    const finger = name.match(/^(index|middle|ring|pinky|thumb)_0([123])_([lr])$/);
    if (finger) {
      const [, which, seg, s] = finger;
      const hand = pose[`fingers_${s}`] ?? {};
      const curl = which === "thumb" ? (hand.thumb ?? hand.curl ?? 0.3) * 0.5 : (hand[which] ?? hand.curl ?? 0.3);
      const amount = curl * [0, 70, 85, 55][Number(seg)];
      // In the T-pose the palm faces down, so curling turns about Z.
      // The thumb folds across the palm instead.
      // `spread` fans the index toward the thumb and the middle away from it, at the knuckle.
      const fan = seg === "1" && hand.spread ? ({ index: 1, middle: -1 }[which] ?? 0) * hand.spread * -ARM[s] : 0;
      const axis = which === "thumb" ? [0, amount * 0.6 * ARM[s], -amount * 0.3 * ARM[s]] : [0, fan, -amount * ARM[s]];
      place(bone, withDelta(bone, euler(axis)));
      continue;
    }

    // Plain rotations. (hand_* and foot_* name IK targets, not rotations.)
    const rot = pose[name];
    place(bone, Array.isArray(rot) ? withDelta(bone, euler(rot)) : bone.r.clone());
  }
  return out;
}

/* ---------------------------------------------------------------- timing */

const ease = {
  linear: (x) => x,
  inOut: (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2),
  out: (x) => 1 - (1 - x) ** 3,
  in: (x) => x * x * x,
  /** Overshoots a little and settles: a limb that lands. */
  settle: (x) => {
    const c = 1.4;
    return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2;
  },
};

const isObject = (v) => v && typeof v === "object" && !Array.isArray(v);

/** Deep-merge `b` over `a` (poses are partial; keys hold what they omit). */
function over(a, b) {
  const out = { ...a };
  for (const [k, v] of Object.entries(b ?? {})) out[k] = isObject(v) && isObject(a?.[k]) ? over(a[k], v) : v;
  return out;
}

function lerpValue(a, b, x) {
  if (typeof a === "number" && typeof b === "number") return a + (b - a) * x;
  if (Array.isArray(a) && Array.isArray(b)) return a.map((v, i) => lerpValue(v, b[i] ?? v, x));
  if (isObject(a) && isObject(b)) {
    const out = {};
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      out[k] = k in a && k in b ? lerpValue(a[k], b[k], x) : (b[k] ?? a[k]);
    }
    return out;
  }
  return x < 0.5 ? a : b;
}

/** Add `b` onto `a`, number by number. */
function plus(a, b) {
  if (b === undefined) return a;
  if (typeof a === "number" || a === undefined) return (a ?? 0) + (typeof b === "number" ? b : 0);
  if (Array.isArray(a) || Array.isArray(b)) {
    const aa = a ?? [];
    return (b ?? []).length > aa.length ? b.map((v, i) => (aa[i] ?? 0) + v) : aa.map((v, i) => v + (b[i] ?? 0));
  }
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = plus(a?.[k], v);
  return out;
}

/** The pose a clip holds at time `t`. */
function poseAt(clip, t) {
  const keys = [];
  let acc = clip.base ?? {};
  for (const key of clip.keys) {
    acc = over(acc, key.pose);
    keys.push({ ...key, full: acc });
  }
  let pose = keys[0].full;
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (t >= a.t && t <= b.t) {
      const x = (ease[b.ease ?? "inOut"] ?? ease.inOut)((t - a.t) / Math.max(1e-6, b.t - a.t));
      pose = lerpValue(a.full, b.full, x);
      break;
    }
    if (t > b.t) pose = b.full;
  }
  return clip.wobble ? plus(pose, clip.wobble(t)) : pose;
}

/* ------------------------------------------------------------- the clips */

const wave = (t, period, amp, phase = 0) => Math.sin(((t / period) * 2 + phase) * Math.PI) * amp;
const env = (t, a, b, fade = 0.25) => Math.min(1, Math.max(0, (t - a) / fade)) * Math.min(1, Math.max(0, (b - t) / fade));

/** Standing, relaxed: the pose every clip starts and ends in. */
const STAND = {
  pelvis: { at: [0, -0.012, 0], rot: [0, 0, 0] },
  spine_01: [-2, 0, 0],
  spine_02: [1, 0, 0],
  spine_03: [2, 0, 0],
  neck_01: [-4, 0, 0],
  Head: [4, 0, 0],
  clavicle_l: [0, 0, -9],
  clavicle_r: [0, 0, 9],
  hand_l: { at: [0.025, -0.468, 0.035], pole: [0.25, -0.2, -1] },
  hand_r: { at: [-0.025, -0.468, 0.035], pole: [-0.25, -0.2, -1] },
  foot_l: { at: [0.01, 0, 0.01], pole: [0.1, 0, 1] },
  foot_r: { at: [-0.01, 0, -0.01], pole: [-0.1, 0, 1] },
  fingers_l: { curl: 0.35, thumb: 0.3 },
  fingers_r: { curl: 0.35, thumb: 0.3 },
};

/** Down on the right knee, left foot planted forward: petting height. */
const KNEEL = {
  pelvis: { at: [0.01, -0.47, 0.02], rot: [6, -6, 0] },
  spine_01: [8, 0, 0],
  spine_02: [8, 0, 0],
  spine_03: [6, 0, 0],
  neck_01: [6, 0, 0],
  Head: [14, 0, 0],
  foot_l: { at: [0.03, 0, 0.36], pole: [0.15, 0.2, 1] },
  foot_r: { at: [-0.02, 0.05, -0.37], pole: [-0.05, -0.6, 1], pitch: 38, toes: 50 },
};

/**
 * The pet stands facing a kneeling player, its centre at (-0.2, 0, 0.74)
 * in the player's space (the room's "front" formation), so its crown is
 * about here. The room anchors the hand to the real crown at runtime; this
 * only has to be close.
 */
const PET_HEAD = [-0.2, 0.8, 0.6];
/** The pet's mouth, facing a kneeling player. */
const PET_MOUTH = [-0.19, 0.42, 0.34];
/** Where the bowl goes down, just in front of the pet's mouth. */
const BOWL_FLOOR = [-0.2, 0.11, 0.36];

/** Both knees down, sitting back on the heels: low enough to reach the floor. */
const SIT_BACK = {
  pelvis: { at: [0, -0.66, -0.1], rot: [14, 0, 0] },
  spine_01: [18, 0, 0],
  spine_02: [18, 0, 0],
  spine_03: [14, 0, 0],
  Head: [10, 0, 0],
  foot_l: { at: [0.02, 0.03, -0.3], pole: [0.1, -0.5, 1], pitch: -20, toes: 0 },
  foot_r: { at: [-0.02, 0.03, -0.3], pole: [-0.1, -0.5, 1], pitch: -20, toes: 0 },
};

const idle = {
  name: "Idle",
  duration: 6,
  loop: true,
  base: STAND,
  keys: [{ t: 0 }, { t: 6 }],
  // Weight drifts between the feet, the chest breathes twice, the head
  // wanders a little. Every period divides 6 s, so the loop is seamless.
  wobble: (t) => ({
    pelvis: { at: [wave(t, 6, 0.012), wave(t, 3, 0.004, 0.5), 0], rot: [0, wave(t, 6, 2), wave(t, 6, -1.8)] },
    spine_01: [0, wave(t, 6, -1), wave(t, 6, 1.4)],
    spine_02: [wave(t, 3, 0.8), 0, 0],
    spine_03: [wave(t, 3, -1.4), wave(t, 6, -1.5), wave(t, 6, 0.8)],
    clavicle_l: [0, 0, wave(t, 3, 1.2, 0.2)],
    clavicle_r: [0, 0, wave(t, 3, -1.2, 0.2)],
    neck_01: [wave(t, 6, 1.5, 0.3), wave(t, 6, 3, 1.2), 0],
    Head: [wave(t, 3, 1, 0.8), wave(t, 6, 2, 1.1), wave(t, 6, 1.5)],
    hand_l: { at: [0, wave(t, 3, 0.004, 0.3), wave(t, 6, 0.012)] },
    hand_r: { at: [0, wave(t, 3, 0.004, 0.3), wave(t, 6, 0.012, 1)] },
  }),
};

const hello = {
  name: "Wave",
  duration: 2.8,
  base: STAND,
  keys: [
    { t: 0 },
    {
      t: 0.5,
      ease: "out",
      pose: {
        spine_03: [0, 4, 5],
        neck_01: [-2, 6, -3],
        Head: [0, 4, 6],
        clavicle_r: [0, 0, -6],
        hand_r: { at: [-0.3, 0.27, 0.1], pole: [-0.6, -1, -0.1], point: [-0.1, 1, 0.1], palm: [0.15, 0, 1] },
        fingers_r: { curl: 0.05, thumb: 0.1 },
      },
    },
    { t: 2.15 },
    { t: 2.8, ease: "inOut", pose: STAND },
  ],
  wobble: (t) => {
    const k = env(t, 0.45, 2.2, 0.2);
    const s = Math.sin((t - 0.45) * 2 * Math.PI * 2.1);
    return {
      hand_r: { at: [0.1 * s * k, 0.015 * Math.abs(s) * k, 0], point: [0.7 * s * k, 0, 0] },
      spine_03: [0, 2 * s * k, 0],
      Head: [0, 0, -3 * s * k],
    };
  },
};

/**
 * 120 BPM — a beat every half second, two bars, and it loops. Bar one is a
 * step-clap side to side; bar two raises the roof, sways, and points.
 */
const BEAT = 0.5;
const CHEST = {
  hand_l: { at: [-0.12, -0.24, 0.3], pole: [0.8, -0.6, -0.4], point: [-0.4, 0.5, 1], palm: [-1, 0, 0.2] },
  hand_r: { at: [0.12, -0.24, 0.3], pole: [-0.8, -0.6, -0.4], point: [0.4, 0.5, 1], palm: [1, 0, 0.2] },
  fingers_l: { curl: 0.15, thumb: 0.2 },
  fingers_r: { curl: 0.15, thumb: 0.2 },
};
const CLAP = {
  hand_l: { at: [-0.17, -0.2, 0.32] },
  hand_r: { at: [0.17, -0.2, 0.32] },
};
const SWING = (side) => ({
  hand_l: { at: [side * 0.18 - 0.02, -0.14, 0.28], pole: [0.6, -0.8, -0.4] },
  hand_r: { at: [side * 0.18 + 0.02, -0.14, 0.28], pole: [-0.6, -0.8, -0.4] },
  fingers_l: { curl: 0.7, thumb: 0.6 },
  fingers_r: { curl: 0.7, thumb: 0.6 },
});
const ROOF = {
  hand_l: { at: [0.02, 0.42, 0.08], pole: [1, -0.4, -0.5], point: [0, 1, 0.1], palm: [0, 0, 1] },
  hand_r: { at: [-0.02, 0.42, 0.08], pole: [-1, -0.4, -0.5], point: [0, 1, 0.1], palm: [0, 0, 1] },
  fingers_l: { curl: 0.05, thumb: 0.1 },
  fingers_r: { curl: 0.05, thumb: 0.1 },
};
const dance = {
  name: "Dance",
  duration: 8 * BEAT,
  loop: true,
  base: over(STAND, CHEST),
  keys: [
    { t: 0 },
    { t: 1 * BEAT, pose: { ...SWING(-1), foot_r: { at: [-0.17, 0, 0] }, pelvis: { at: [-0.07, -0.05, 0], rot: [0, -10, 5] }, spine_03: [0, -12, -4], Head: [0, -8, 6] } },
    { t: 2 * BEAT, ease: "out", pose: { ...CHEST, ...CLAP, foot_l: { at: [-0.15, 0, 0.01] }, pelvis: { at: [-0.1, -0.02, 0], rot: [0, -3, 0] }, spine_03: [0, -4, 0], Head: [4, 0, 0] } },
    { t: 3 * BEAT, pose: { ...SWING(1), foot_l: { at: [0.17, 0, 0] }, foot_r: { at: [-0.01, 0, -0.01] }, pelvis: { at: [0.03, -0.05, 0], rot: [0, 10, -5] }, spine_03: [0, 12, 4], Head: [0, 8, -6] } },
    { t: 4 * BEAT, ease: "out", pose: { ...CHEST, ...CLAP, foot_l: { at: [0.01, 0, 0.01] }, pelvis: { at: [0, -0.02, 0], rot: [0, 0, 0] }, spine_03: [0, 0, 0], Head: [4, 0, 0] } },
    { t: 5 * BEAT, pose: { ...ROOF, pelvis: { at: [0.06, -0.05, 0], rot: [0, 0, -7] }, spine_02: [0, 0, 6], Head: [-4, 0, 9] } },
    { t: 6 * BEAT, pose: { hand_l: { at: [0.1, 0.34, 0.1] }, hand_r: { at: [0.06, 0.4, 0.1] }, pelvis: { at: [-0.06, -0.05, 0], rot: [0, 0, 7] }, spine_02: [0, 0, -6], Head: [-4, 0, -9] } },
    {
      t: 7 * BEAT,
      ease: "settle",
      pose: {
        hand_r: { at: [-0.34, 0.36, 0.2], pole: [-0.5, -1, -0.3], point: [-0.6, 1, 0.3], palm: [0.4, 0, 1] },
        fingers_r: { index: 0, middle: 0.95, ring: 1, pinky: 1, thumb: 0.8 },
        hand_l: { at: [0.1, -0.36, 0.02], pole: [1, 0.2, -0.3] },
        fingers_l: { curl: 0.6 },
        pelvis: { at: [0.05, -0.03, 0], rot: [0, 8, -8] },
        spine_02: [0, 0, 4],
        spine_03: [-4, -8, 0],
        Head: [-8, -12, 6],
      },
    },
    { t: 8 * BEAT, pose: { ...CHEST, pelvis: { at: [0, 0, 0], rot: [0, 0, 0] }, spine_02: [0, 0, 0], spine_03: [0, 0, 0], Head: [0, 0, 0] } },
  ],
  // A bounce on every beat, and the head nods with it.
  wobble: (t) => {
    const b = Math.abs(Math.cos((t / BEAT) * Math.PI));
    return {
      pelvis: { at: [0, -0.04 * (1 - b), 0] },
      Head: [6 * (1 - b), 0, 0],
      spine_03: [3 * (1 - b), 0, 0],
    };
  },
};

/** Kneel, reach the pet's head, stroke three times, get up. */
const pet = {
  name: "Pet",
  duration: 5.6,
  base: STAND,
  keys: [
    { t: 0 },
    { t: 0.35, pose: { foot_l: { at: [0.02, 0.1, 0.2] }, pelvis: { at: [0, -0.08, 0.02] }, spine_01: [4, 0, 0] } },
    { t: 1.0, ease: "settle", pose: KNEEL },
    {
      t: 1.45,
      pose: {
        hand_r: { at: PET_HEAD, abs: true, pole: [-0.9, 0.1, -0.5], point: [0.05, -0.25, 1], palm: [0, -1, 0.15] },
        fingers_r: { curl: 0.15, thumb: 0.1 },
        hand_l: { at: [0.16, 0.4, 0.2], abs: true, pole: [0.8, -0.3, -0.4] },
        spine_02: [12, 0, 0],
        spine_03: [10, 10, 0],
        Head: [16, 8, 0],
      },
    },
    { t: 4.2 },
    { t: 4.7, pose: { hand_r: { at: [-0.2, 0.42, 0.28], abs: true, point: [0, -1, 0.2], palm: [0.6, 0, 0.4] }, fingers_r: { curl: 0.35 } } },
    { t: 5.6, pose: STAND },
  ],
  // Three strokes from the head back along the pet, lifting between them.
  wobble: (t) => {
    const k = env(t, 1.45, 4.2, 0.15);
    if (!k) return {};
    const phase = ((t - 1.45) / 0.9) % 1;
    const along = phase < 0.62 ? phase / 0.62 : 1 - (phase - 0.62) / 0.38;
    const lift = phase < 0.62 ? 0 : Math.sin(((phase - 0.62) / 0.38) * Math.PI) * 0.04;
    return {
      hand_r: { at: [0, lift * k - 0.01 * k, 0.16 * along * k] },
      spine_03: [3 * along * k, 0, 0],
    };
  },
};

/**
 * Both knees down with a bowl in both hands, bow to set it on the floor in
 * front of the pet, sit up and watch it eat, then get up.
 */
const BOWL_HOLD = {
  hand_l: { at: [0.1, 0.95, 0.3], abs: true, pole: [1, -0.4, -0.3], point: [-0.5, 0, 1], palm: [-1, 0.2, 0] },
  hand_r: { at: [-0.14, 0.95, 0.3], abs: true, pole: [-1, -0.4, -0.3], point: [0.5, 0, 1], palm: [1, 0.2, 0] },
};
const feed = {
  name: "Feed",
  duration: 6.4,
  base: STAND,
  keys: [
    { t: 0 },
    { t: 0.4, pose: { pelvis: { at: [0, -0.1, -0.02] }, spine_01: [6, 0, 0], ...BOWL_HOLD } },
    { t: 1.05, ease: "settle", pose: { ...SIT_BACK, hand_l: { at: [0.02, 0.62, 0.28] }, hand_r: { at: [-0.22, 0.62, 0.28] } } },
    {
      t: 1.75,
      pose: {
        hand_l: { at: [BOWL_FLOOR[0] + 0.11, BOWL_FLOOR[1], BOWL_FLOOR[2]] },
        hand_r: { at: [BOWL_FLOOR[0] - 0.11, BOWL_FLOOR[1], BOWL_FLOOR[2]] },
        pelvis: { rot: [22, 0, 0] },
        spine_01: [24, 0, 0],
        spine_02: [22, 0, 0],
        spine_03: [18, 0, 0],
        Head: [4, 0, 0],
      },
    },
    { t: 1.95 },
    {
      t: 2.6,
      pose: {
        hand_l: { at: [0.14, 0.34, 0.14], pole: [1, -0.3, -0.3], point: [0, -0.4, 1], palm: [-0.3, -1, 0] },
        hand_r: { at: [-0.16, 0.34, 0.14], pole: [-1, -0.3, -0.3], point: [0, -0.4, 1], palm: [0.3, -1, 0] },
        pelvis: { rot: [8, 0, 0] },
        spine_01: [8, 0, 0],
        spine_02: [8, 0, 0],
        spine_03: [6, 0, 0],
        Head: [18, 0, 0],
      },
    },
    { t: 5.3 },
    { t: 5.75, pose: { ...KNEEL, hand_l: { at: [0.16, 0.4, 0.2] }, hand_r: { at: [-0.2, 0.42, 0.26] } } },
    { t: 6.4, pose: STAND },
  ],
};

/** Crouch, hold a treat out at the pet's mouth, let it take it. */
const treat = {
  name: "Treat",
  duration: 4.4,
  base: STAND,
  keys: [
    { t: 0 },
    { t: 0.35, pose: { foot_l: { at: [0.02, 0.1, 0.2] }, pelvis: { at: [0, -0.08, 0.02] }, spine_01: [4, 0, 0] } },
    { t: 1.0, ease: "settle", pose: KNEEL },
    {
      t: 1.4,
      ease: "out",
      pose: {
        hand_r: { at: [PET_MOUTH[0] + 0.02, PET_MOUTH[1] + 0.02, PET_MOUTH[2] - 0.08], abs: true, pole: [-0.9, -0.3, -0.4], point: [0.1, 0.1, 1], palm: [0.9, 0, -0.1] },
        fingers_r: { index: 0.45, middle: 0.5, ring: 0.9, pinky: 0.95, thumb: 0.55 },
        hand_l: { at: [0.16, 0.4, 0.2], abs: true, pole: [0.8, -0.3, -0.4] },
        spine_01: [12, 0, 0],
        spine_02: [12, 0, 0],
        spine_03: [8, 6, 0],
        Head: [16, 6, 0],
      },
    },
    { t: 3.2 },
    { t: 3.5, pose: { hand_r: { at: [-0.14, 0.44, 0.34] }, fingers_r: { curl: 0.3, thumb: 0.3 } } },
    { t: 4.4, pose: STAND },
  ],
};

/** Overhand throw: wind up, step into it, release, follow through. */
const THROW_RELEASE = 0.78;
const toss = {
  name: "Throw",
  duration: 1.9,
  base: STAND,
  keys: [
    { t: 0 },
    { t: 0.45, pose: { pelvis: { at: [0, -0.03, -0.04], rot: [0, 18, 0] }, spine_03: [-6, 20, 0], foot_l: { at: [0.02, 0.06, 0.12] }, hand_r: { at: [-0.18, 1.62, -0.22], abs: true, pole: [-0.5, -1, -0.3], point: [0, 0.3, -1], palm: [0.2, 1, 0] }, fingers_r: { curl: 0.7 }, hand_l: { at: [0.25, 1.35, 0.35], abs: true, pole: [1, -0.5, -0.4] } } },
    { t: THROW_RELEASE, ease: "in", pose: { pelvis: { at: [0, -0.05, 0.08], rot: [4, -14, 0] }, spine_03: [10, -18, 0], foot_l: { at: [0.02, 0, 0.26] }, hand_r: { at: [-0.12, 1.5, 0.55], point: [0, 0.2, 1], palm: [0, -0.4, 1] }, fingers_r: { curl: 0.15 }, hand_l: { at: [0.28, 1.0, 0.0] } } },
    { t: 1.1, ease: "out", pose: { spine_03: [16, -22, 0], hand_r: { at: [0.18, 0.95, 0.35], pole: [-0.4, -1, 0.2], point: [0.4, -1, 0.3] } } },
    { t: 1.9, pose: STAND },
  ],
};

/** Three claps in front of the chest. */
const clap = {
  name: "Clap",
  duration: 1.8,
  base: STAND,
  keys: [
    { t: 0 },
    { t: 0.3, pose: { hand_l: { at: [0.06, 1.2, 0.3], abs: true, pole: [1, -0.6, -0.3], point: [-0.3, 0.6, 1], palm: [-1, 0, 0] }, hand_r: { at: [-0.06, 1.2, 0.3], abs: true, pole: [-1, -0.6, -0.3], point: [0.3, 0.6, 1], palm: [1, 0, 0] }, fingers_l: { curl: 0.1 }, fingers_r: { curl: 0.1 }, Head: [-4, 0, 0] } },
    { t: 1.35 },
    { t: 1.8, pose: STAND },
  ],
  wobble: (t) => {
    const k = env(t, 0.3, 1.35, 0.08);
    const s = Math.abs(Math.sin(((t - 0.3) / 0.35) * Math.PI)) * k;
    return { hand_l: { at: [0.07 * s, 0, 0] }, hand_r: { at: [-0.07 * s, 0, 0] } };
  },
};

/** A finger to the lips: the pet is going to sleep. */
const hush = {
  name: "Hush",
  duration: 2.8,
  base: STAND,
  keys: [
    { t: 0 },
    // The index finger upright across the lips. The wrist is placed from the
    // head joint, so it lands on either build: the lips sit about 3.5 cm
    // above that joint and 11.5 cm in front of it once the room scales the
    // head (HEAD_SCALE), and the finger's middle is 14 cm up from the wrist.
    { t: 0.55, ease: "out", pose: { hand_r: { at: [-0.01, -0.105, 0.14], from: "Head", pole: [-1, -1, -0.2], point: [0.05, 1, 0.1], palm: [0.1, 0, -1] }, fingers_r: { index: 0, middle: 0.95, ring: 1, pinky: 1, thumb: 0.8 }, Head: [8, 0, 6], spine_03: [4, 0, 0] } },
    { t: 2.1 },
    { t: 2.8, pose: STAND },
  ],
};

const CLIPS = [idle, hello, dance, pet, feed, treat, toss, clap, hush];

/**
 * Fists up, twice. Shipped on its own as `public/3d/emotes/cheer.glb`, the
 * way a future emote would arrive: a rig and a clip, no body. Rotations
 * only, so it plays on either build.
 */
const cheer = {
  name: "Cheer",
  duration: 2.4,
  base: STAND,
  keys: [
    { t: 0 },
    {
      t: 0.32,
      ease: "out",
      pose: {
        hand_l: { at: [0.06, 0.46, 0.12], pole: [1, -0.3, -0.5] },
        hand_r: { at: [-0.06, 0.46, 0.12], pole: [-1, -0.3, -0.5] },
        fingers_l: { curl: 0.9, thumb: 0.8 },
        fingers_r: { curl: 0.9, thumb: 0.8 },
        spine_03: [-8, 0, 0],
        Head: [-12, 0, 0],
      },
    },
    { t: 1.95 },
    { t: 2.4, pose: STAND },
  ],
  wobble: (t) => {
    const k = env(t, 0.32, 1.95, 0.15);
    const s = Math.abs(Math.sin((t - 0.32) * Math.PI * 2.4)) * k;
    return { hand_l: { at: [0, 0.07 * s, 0] }, hand_r: { at: [0, 0.07 * s, 0] }, spine_02: [-3 * s, 0, 0], Head: [-4 * s, 0, 0] };
  },
};

/**
 * A heart over the head: the hands meet on its crown, palms down and
 * fingers touching, elbows out wide for the lobes, and the body sways. The
 * wrists are placed from the head joint so they land on either build: the
 * scaled crown sits about 25 cm above it.
 */
const heart = {
  name: "Heart",
  duration: 2.9,
  base: STAND,
  keys: [
    { t: 0 },
    {
      t: 0.5,
      ease: "settle",
      pose: {
        hand_l: { at: [0.13, 0.25, -0.01], from: "Head", pole: [1, 0.5, 0], point: [-1, 0.05, 0], palm: [0, -1, 0] },
        hand_r: { at: [-0.13, 0.25, -0.01], from: "Head", pole: [-1, 0.5, 0], point: [1, 0.05, 0], palm: [0, -1, 0] },
        fingers_l: { curl: 0.1, thumb: 0.15 },
        fingers_r: { curl: 0.1, thumb: 0.15 },
        spine_03: [-3, 0, 0],
        Head: [-2, 0, 0],
      },
    },
    { t: 2.35 },
    { t: 2.9, pose: STAND },
  ],
  wobble: (t) => {
    const k = env(t, 0.5, 2.35, 0.25);
    const s = Math.sin((t - 0.5) * Math.PI * 1.6) * k;
    return { pelvis: { rot: [0, 0, 2.5 * s] }, spine_02: [0, 0, -3.5 * s], Head: [0, 0, 7 * s] };
  },
};

/**
 * Two fingers up beside the cheek, spread in a V, the palm out and the
 * head tipped toward them; the other hand on the hip. The sign bobs twice,
 * the way a photo is asked for.
 */
const peace = {
  name: "Peace",
  duration: 2.6,
  base: STAND,
  keys: [
    { t: 0 },
    {
      t: 0.42,
      ease: "settle",
      pose: {
        hand_r: { at: [-0.21, -0.03, 0.05], from: "Head", pole: [-1, -1, -0.2], point: [-0.25, 1, 0.05], palm: [0, 0, 1] },
        fingers_r: { index: 0, middle: 0, ring: 1, pinky: 1, thumb: 0.9, spread: 14 },
        hand_l: { at: [-0.02, -0.37, -0.03], pole: [1, -0.1, -0.7], point: [-0.35, -0.8, 0.35], palm: [-1, 0, 0] },
        fingers_l: { curl: 0.25, thumb: 0.4 },
        pelvis: { rot: [0, 0, -3] },
        spine_03: [0, -4, 4],
        Head: [2, -4, 12],
      },
    },
    { t: 2.1 },
    { t: 2.6, pose: STAND },
  ],
  wobble: (t) => {
    const k = env(t, 0.5, 1.5, 0.1);
    const s = Math.abs(Math.sin((t - 0.5) * Math.PI * 2)) * k;
    return { hand_r: { at: [0, 0.025 * s, 0] }, Head: [0, 0, 2 * s] };
  },
};

/**
 * A thumbs up: the fist raised beside the shoulder, thumb to the sky, and
 * a nod to go with it as the fist pumps.
 */
const thumbs = {
  name: "Thumbs up",
  duration: 2.3,
  base: STAND,
  keys: [
    { t: 0 },
    {
      t: 0.4,
      ease: "settle",
      pose: {
        hand_r: { at: [-0.08, 0.0, 0.24], pole: [-0.6, -1, -0.2], point: [0, 0, 1], palm: [1, 0, 0] },
        fingers_r: { curl: 1, thumb: 0 },
        spine_03: [2, -6, 0],
        Head: [4, -4, -4],
      },
    },
    { t: 1.8 },
    { t: 2.3, pose: STAND },
  ],
  wobble: (t) => {
    const k = env(t, 0.45, 1.35, 0.1);
    const nod = Math.max(0, Math.sin((t - 0.45) * Math.PI * 2.2)) * k;
    return { Head: [6 * nod, 0, 0], hand_r: { at: [0, 0.025 * nod, 0] } };
  },
};

export const EMOTE_CLIPS = [cheer, heart, peace, thumbs];

/* ----------------------------------------------------------------- bake */

/**
 * Sample every clip on this rig and write glTF animations targeting the
 * rig's joint nodes. Joints that never leave their rest pose get no channel.
 */
export function bake(doc, rig, clips = CLIPS, { rotationsOnly = false } = {}) {
  const buffer = doc.getRoot().listBuffers()[0];
  const report = [];
  for (const clip of clips) {
    const frames = Math.round(clip.duration * FPS);
    const times = Float32Array.from({ length: frames + 1 }, (_, i) => i / FPS);
    const tracks = new Map();
    for (let f = 0; f <= frames; f++) {
      // A loop's last frame is its first, so the seam is exact.
      const t = clip.loop && f === frames ? 0 : times[f];
      const solved = solve(rig, poseAt(clip, t));
      for (const [name, { r, t: tr }] of solved) {
        if (!tracks.has(name)) tracks.set(name, { r: new Float32Array((frames + 1) * 4), t: tr ? new Float32Array((frames + 1) * 3) : null });
        const track = tracks.get(name);
        // Keep quaternions on one hemisphere so interpolation takes the short way.
        if (f > 0) {
          const prev = track.r.subarray((f - 1) * 4, f * 4);
          if (prev[0] * r.x + prev[1] * r.y + prev[2] * r.z + prev[3] * r.w < 0) r.set(-r.x, -r.y, -r.z, -r.w);
        }
        track.r.set([r.x, r.y, r.z, r.w], f * 4);
        if (track.t && tr) track.t.set([tr.x, tr.y, tr.z], f * 3);
      }
    }
    const animation = doc.createAnimation(clip.name);
    const input = doc.createAccessor().setType("SCALAR").setArray(times).setBuffer(buffer);
    let channels = 0;
    for (const [name, track] of tracks) {
      const bone = rig.get(name);
      if (name.includes("leaf")) continue;
      const moved = (() => {
        for (let f = 0; f <= frames; f++) {
          const q = track.r.subarray(f * 4, f * 4 + 4);
          if (Math.abs(Math.abs(q[0] * bone.r.x + q[1] * bone.r.y + q[2] * bone.r.z + q[3] * bone.r.w) - 1) > 1e-6) return true;
        }
        return false;
      })();
      if (moved) {
        const sampler = doc.createAnimationSampler().setInput(input).setOutput(doc.createAccessor().setType("VEC4").setArray(track.r).setBuffer(buffer)).setInterpolation("LINEAR");
        animation.addSampler(sampler).addChannel(doc.createAnimationChannel().setTargetNode(bone.node).setTargetPath("rotation").setSampler(sampler));
        channels++;
      }
      if (track.t && !rotationsOnly) {
        const sampler = doc.createAnimationSampler().setInput(input).setOutput(doc.createAccessor().setType("VEC3").setArray(track.t).setBuffer(buffer)).setInterpolation("LINEAR");
        animation.addSampler(sampler).addChannel(doc.createAnimationChannel().setTargetNode(bone.node).setTargetPath("translation").setSampler(sampler));
        channels++;
      }
    }
    report.push(`${clip.name} ${clip.duration}s/${channels}ch`);
  }
  return report;
}
