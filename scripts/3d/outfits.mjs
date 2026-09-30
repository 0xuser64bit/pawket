/**
 * Clothes for a pack that ships none. Each garment is a region of the body,
 * cut along clean lines, then shelled: smoothed so muscle does not read
 * through cloth, pushed out by its thickness, and closed with a hem wall.
 *
 * The same cuts tag every body triangle with the garments that cover it
 * (`_COVER`, one bit per garment), so the runtime can collapse skin that a
 * worn garment hides instead of drawing it underneath.
 *
 * Every line is placed from the body's own joints, so both bodies get the
 * same wardrobe fitted to their proportions. Bind pose is a T-pose: arms
 * run along ±X, legs along -Y.
 */
import { ConvexHull } from "three/examples/jsm/math/ConvexHull.js";
import { Vector3 } from "three";
import { cut, shell, splitByTriangleTag, submesh, triangleCentroid, vertexNormals } from "./mesh.mjs";

/** Runtime contract: bit per garment, mirrored in src/components/room3d. */
export const GARMENTS = {
  top_tee: 1,
  top_long: 2,
  top_tank: 4,
  bottom_shorts: 8,
  bottom_trousers: 16,
  shoes_sneakers: 32,
  shoes_boots: 64,
};

/** Sole thickness in metres; the runtime lifts a shod body by this much. */
export const SOLE = 0.02;

const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * Lines on the body, as signed fields (> 0 inside). `joint(name)` returns
 * the bind-space position of a joint.
 */
function lines(joint) {
  const neck = joint("neck_01");
  const pelvis = joint("pelvis");
  const shoulder = Math.abs(joint("upperarm_l")[0]);
  const elbow = Math.abs(joint("lowerarm_l")[0]);
  const wrist = Math.abs(joint("hand_l")[0]);
  const knee = joint("calf_l")[1];
  const ankle = joint("foot_l")[1];
  const hem = pelvis[1] - 0.025;
  const waist = pelvis[1] + 0.07;

  // Arm lines only exist above the hips, rising smoothly out of the way so
  // they never slice a leg.
  const arm = (x) => (v) => x - Math.abs(v.p[0]) + 10 * Math.max(0, hem + 0.05 - v.p[1]);

  return {
    hem,
    waist,
    shoeTop: { shoes_sneakers: ankle + 0.062, shoes_boots: ankle + 0.062 },
    bootTop: knee - 0.19,
    fields: {
      // A crew neck: deeper at the front, climbing steeply onto the
      // shoulders so it only ever cuts around the neck.
      neck: (v) => {
        const front = Math.min(1, Math.max(0, (v.p[2] - neck[2]) / 0.08));
        const side = Math.max(0, Math.abs(v.p[0]) - 0.07);
        return neck[1] + 0.004 - 0.055 * front + side * 3 - v.p[1];
      },
      hem: (v) => v.p[1] - hem,
      armhole: arm(shoulder - 0.012),
      tee: arm(shoulder + 0.45 * (elbow - shoulder)),
      long: arm(wrist - 0.028),
      waist: (v) => waist - v.p[1],
      shorts: (v) => v.p[1] - (knee + 0.12),
      trousers: (v) => v.p[1] - (ankle + 0.045),
      sneakers: (v) => ankle + 0.062 - v.p[1],
      boots: (v) => knee - 0.19 - v.p[1],
      sole: (v) => 0.03 - v.p[1],
    },
    offsets: {
      top_tee: 0.012,
      top_long: 0.012,
      top_tank: 0.011,
      // Trousers hang straight from the knee, so they widen toward the
      // ankle and fall over a shoe instead of hugging the calf.
      bottom_trousers: (p) => 0.008 + 0.016 * smoothstep(knee + 0.05, ankle + 0.05, p[1]),
      bottom_shorts: 0.009,
      shoes_sneakers: 0.016,
      shoes_boots: 0.022,
    },
  };
}

/**
 * Cut the body, tag its triangles, and shell every garment.
 * Returns { body, cover, garments: { name: { upper, sole? } } }.
 */
export function tailor(body, joint) {
  const { fields, offsets, shoeTop } = lines(joint);
  let mesh = body;
  for (const field of Object.values(fields)) mesh = cut(mesh, field);

  const inside = (t, name) => fields[name](triangleCentroid(mesh, t)) > 0;
  const regions = {
    top_tee: (t) => inside(t, "neck") && inside(t, "hem") && inside(t, "tee"),
    top_long: (t) => inside(t, "neck") && inside(t, "hem") && inside(t, "long"),
    top_tank: (t) => inside(t, "neck") && inside(t, "hem") && inside(t, "armhole"),
    bottom_shorts: (t) => inside(t, "waist") && inside(t, "shorts"),
    bottom_trousers: (t) => inside(t, "waist") && inside(t, "trousers"),
    shoes_sneakers: (t) => inside(t, "sneakers"),
    shoes_boots: (t) => inside(t, "boots"),
  };

  const garments = {};
  for (const [name, region] of Object.entries(regions)) {
    if (name.startsWith("shoes")) {
      const foot = { l: [], r: [] };
      for (let t = 0; t < mesh.idx.length / 3; t++) {
        if (!(fields.sneakers(triangleCentroid(mesh, t)) > 0)) continue;
        for (let k = 0; k < 3; k++) {
          const i = mesh.idx[t * 3 + k];
          foot[mesh.pos[i * 3] > 0 ? "l" : "r"].push(i);
        }
      }
      const pair = ["l", "r"].map((side) => last(mesh, [...new Set(foot[side])], shoeTop[name]));
      const shoe = { upper: merge(pair.map((p) => p.upper)), sole: merge(pair.map((p) => p.sole)) };
      if (name === "shoes_boots") {
        const shaft = shell(submesh(mesh, (t) => region(t) && !inside(t, "sneakers")).mesh, {
          offset: () => offsets.shoes_boots,
          iterations: 8,
          drape: 20,
          maxLift: 0.02,
        });
        garments[name] = { upper: merge([shoe.upper, shaft]), sole: shoe.sole };
      } else {
        garments[name] = shoe;
      }
      continue;
    }
    const { mesh: part } = submesh(mesh, region);
    const thickness = offsets[name];
    const offset = typeof thickness === "function" ? thickness : () => thickness;
    const cloth = shell(part, {
      offset,
      iterations: name.startsWith("top") ? 10 : 8,
      drape: name.startsWith("top") ? 40 : 25,
      maxLift: name.startsWith("top") ? 0.02 : 0.014,
    });
    garments[name] = { upper: cloth };
  }

  const tags = [];
  for (let t = 0; t < mesh.idx.length / 3; t++) {
    let bits = 0;
    for (const [name, region] of Object.entries(regions)) if (region(t)) bits |= GARMENTS[name];
    tags.push(bits);
  }
  const split = splitByTriangleTag(mesh, (t) => tags[t]);
  return { body: split.mesh, cover: split.tags, garments };
}

/**
 * A shoe is built on a last, not on a foot: the convex hull of the foot
 * below the collar has no toes and no arch. The cap is opened for the leg
 * and its rim pulled in to hug the ankle, the hull is subdivided and
 * rounded, the underside becomes a flat sole SOLE below the foot, and a
 * clean cut separates the sole band from the upper.
 */
function last(body, indices, top) {
  const points = indices.map((i) => new Vector3(body.pos[i * 3], body.pos[i * 3 + 1], body.pos[i * 3 + 2]));
  const hull = new ConvexHull().setFromPoints(points);
  const id = new Map();
  let pos = [];
  let tris = [];
  const centre = points.reduce((c, p) => c.add(p), new Vector3()).multiplyScalar(1 / points.length);
  for (const face of hull.faces) {
    const loop = [];
    let edge = face.edge;
    do {
      loop.push(edge.head().point);
      edge = edge.next;
    } while (edge !== face.edge);
    // The collar: no cap over the ankle.
    if (loop.every((p) => p.y > top - 1e-4)) continue;
    const ids = loop.map((p) => {
      let n = id.get(p);
      if (n === undefined) {
        n = pos.length;
        id.set(p, n);
        pos.push([p.x, p.y, p.z]);
      }
      return n;
    });
    for (let k = 1; k < ids.length - 1; k++) tris.push(ids[0], ids[k], ids[k + 1]);
  }
  // Outward winding.
  for (let t = 0; t < tris.length; t += 3) {
    const [a, b, c] = [pos[tris[t]], pos[tris[t + 1]], pos[tris[t + 2]]];
    const n = new Vector3(...b).sub(new Vector3(...a)).cross(new Vector3(...c).sub(new Vector3(...a)));
    const out = new Vector3(...a).add(new Vector3(...b)).add(new Vector3(...c)).multiplyScalar(1 / 3).sub(centre);
    if (n.dot(out) < 0) [tris[t + 1], tris[t + 2]] = [tris[t + 2], tris[t + 1]];
  }
  ({ pos, tris } = subdivide(pos, tris));

  const nearest = (p) => {
    let best = 0;
    let bestD = Infinity;
    indices.forEach((i, k) => {
      const d = (body.pos[i * 3] - p[0]) ** 2 + (body.pos[i * 3 + 1] - p[1]) ** 2 + (body.pos[i * 3 + 2] - p[2]) ** 2;
      if (d < bestD) {
        bestD = d;
        best = k;
      }
    });
    return indices[best];
  };
  // Rim: hug the ankle it wraps.
  const rim = openVertices(tris, pos.length);
  for (const v of rim) {
    const i = nearest(pos[v]);
    pos[v] = [0, 1, 2].map((k) => body.pos[i * 3 + k] + body.nrm[i * 3 + k] * 0.005);
    pos[v][1] = top;
  }
  // Round it: Taubin, rim fixed.
  const neighbours = pos.map(() => new Set());
  for (let t = 0; t < tris.length; t += 3)
    for (let k = 0; k < 3; k++) {
      neighbours[tris[t + k]].add(tris[t + ((k + 1) % 3)]);
      neighbours[tris[t + k]].add(tris[t + ((k + 2) % 3)]);
    }
  const step = (f) => {
    pos = pos.map((p, v) => {
      if (rim.has(v)) return p;
      const avg = [0, 0, 0];
      for (const u of neighbours[v]) for (let k = 0; k < 3; k++) avg[k] += pos[u][k] / neighbours[v].size;
      return p.map((c, k) => c + (avg[k] - c) * f);
    });
  };
  for (let i = 0; i < 14; i++) {
    step(0.5);
    step(-0.53);
  }
  // Leather thickness, then the flat sole.
  const normals = vertexNormals(pos, tris);
  pos = pos.map((p, v) => (rim.has(v) ? p : p.map((c, k) => c + normals[v][k] * 0.004)));
  const floorY = Math.min(...indices.map((i) => body.pos[i * 3 + 1]));
  pos = pos.map((p) => (p[1] < floorY + 0.012 ? [p[0], -SOLE + (Math.max(p[1], floorY) - floorY) * 0.4, p[2]] : p));

  const count = pos.length;
  const shoe = {
    pos: Float32Array.from(pos.flat()),
    nrm: Float32Array.from(vertexNormals(pos, tris).flat()),
    uv: null,
    j: new Uint16Array(count * 4),
    w: new Float32Array(count * 4),
    idx: Uint32Array.from(tris),
  };
  pos.forEach((p, v) => {
    const i = nearest(p);
    shoe.j.set(body.j.subarray(i * 4, i * 4 + 4), v * 4);
    shoe.w.set(body.w.subarray(i * 4, i * 4 + 4), v * 4);
  });
  const split = cut(shoe, (v) => v.p[1] - SOLE_TOP);
  const band = (t) => {
    let y = 0;
    for (let k = 0; k < 3; k++) y += split.pos[split.idx[t * 3 + k] * 3 + 1] / 3;
    return y < SOLE_TOP;
  };
  return { upper: submesh(split, (t) => !band(t)).mesh, sole: submesh(split, band).mesh };
}

/** Top of the sole band, above the floor the body stands on. */
const SOLE_TOP = 0.012;

function openVertices(tris, count) {
  const use = new Map();
  for (let t = 0; t < tris.length; t += 3)
    for (let k = 0; k < 3; k++) {
      const a = tris[t + k];
      const b = tris[t + ((k + 1) % 3)];
      const key = a < b ? `${a}:${b}` : `${b}:${a}`;
      use.set(key, (use.get(key) ?? 0) + 1);
    }
  const rim = new Set();
  for (const [key, n] of use) if (n === 1) key.split(":").forEach((v) => rim.add(Number(v)));
  void count;
  return rim;
}

/** One 1→4 midpoint subdivision, sharing midpoints across edges. */
function subdivide(pos, tris) {
  const out = pos.slice();
  const mids = new Map();
  const mid = (a, b) => {
    const key = a < b ? `${a}:${b}` : `${b}:${a}`;
    let m = mids.get(key);
    if (m === undefined) {
      m = out.length;
      out.push([0, 1, 2].map((k) => (pos[a][k] + pos[b][k]) / 2));
      mids.set(key, m);
    }
    return m;
  };
  const next = [];
  for (let t = 0; t < tris.length; t += 3) {
    const [a, b, c] = [tris[t], tris[t + 1], tris[t + 2]];
    const ab = mid(a, b);
    const bc = mid(b, c);
    const ca = mid(c, a);
    next.push(a, ab, ca, ab, b, bc, ca, bc, c, ab, bc, ca);
  }
  return { pos: out, tris: next };
}

/** Concatenate meshes that share a skin. */
function merge(meshes) {
  const size = (key, n) => meshes.reduce((s, m) => s + m[key].length, 0) / n;
  const out = {
    pos: new Float32Array(size("pos", 1)),
    nrm: new Float32Array(size("nrm", 1)),
    uv: null,
    j: new Uint16Array(size("j", 1)),
    w: new Float32Array(size("w", 1)),
    idx: new Uint32Array(size("idx", 1)),
  };
  let v = 0;
  let t = 0;
  for (const m of meshes) {
    out.pos.set(m.pos, v * 3);
    out.nrm.set(m.nrm, v * 3);
    out.j.set(m.j, v * 4);
    out.w.set(m.w, v * 4);
    out.idx.set(m.idx.map((i) => i + v), t);
    v += m.pos.length / 3;
    t += m.idx.length;
  }
  return out;
}
