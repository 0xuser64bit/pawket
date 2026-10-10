/**
 * Typed-array meshes for the 3D pipeline. No Blender here: the Quaternius
 * body is cut, shelled into clothes and re-skinned with these functions.
 *
 * A mesh is { pos, nrm, uv, j, w, idx } — positions/normals (xyz), one UV
 * set, four skin joints/weights per vertex, and triangle indices. Bind space
 * is Y-up, metres, character facing +Z with its left side on +X.
 */

export function readPrimitive(prim) {
  const n = prim.getAttribute("POSITION").getCount();
  const take = (semantic, size, Type) => {
    const accessor = prim.getAttribute(semantic);
    if (!accessor) return null;
    const out = new Type(n * size);
    const el = [];
    for (let i = 0; i < n; i++) {
      accessor.getElement(i, el);
      for (let k = 0; k < size; k++) out[i * size + k] = el[k];
    }
    return out;
  };
  const indices = prim.getIndices();
  return {
    pos: take("POSITION", 3, Float32Array),
    nrm: take("NORMAL", 3, Float32Array),
    uv: take("TEXCOORD_0", 2, Float32Array),
    j: take("JOINTS_0", 4, Uint16Array),
    w: take("WEIGHTS_0", 4, Float32Array),
    idx: indices ? Uint32Array.from(indices.getArray()) : Uint32Array.from({ length: n }, (_, i) => i),
  };
}

/** Growable copy of a mesh, so cuts can append vertices. */
function growable(mesh) {
  return {
    pos: Array.from(mesh.pos),
    nrm: Array.from(mesh.nrm),
    uv: mesh.uv ? Array.from(mesh.uv) : null,
    j: Array.from(mesh.j),
    w: Array.from(mesh.w),
  };
}

function freeze(g, idx) {
  return {
    pos: Float32Array.from(g.pos),
    nrm: Float32Array.from(g.nrm),
    uv: g.uv ? Float32Array.from(g.uv) : null,
    j: Uint16Array.from(g.j),
    w: Float32Array.from(g.w),
    idx: Uint32Array.from(idx),
  };
}

/** Blend two skin-weight sets, keep the four strongest, renormalise. */
function blendSkin(ja, wa, jb, wb, t) {
  const acc = new Map();
  for (let k = 0; k < 4; k++) {
    if (wa[k] > 0) acc.set(ja[k], (acc.get(ja[k]) ?? 0) + wa[k] * (1 - t));
    if (wb[k] > 0) acc.set(jb[k], (acc.get(jb[k]) ?? 0) + wb[k] * t);
  }
  const top = [...acc].sort((a, b) => b[1] - a[1]).slice(0, 4);
  const sum = top.reduce((s, [, v]) => s + v, 0) || 1;
  const j = [0, 0, 0, 0];
  const w = [0, 0, 0, 0];
  top.forEach(([joint, weight], k) => {
    j[k] = joint;
    w[k] = weight / sum;
  });
  return { j, w };
}

function vertexOf(mesh, i) {
  return {
    p: [mesh.pos[i * 3], mesh.pos[i * 3 + 1], mesh.pos[i * 3 + 2]],
    n: [mesh.nrm[i * 3], mesh.nrm[i * 3 + 1], mesh.nrm[i * 3 + 2]],
    j: [mesh.j[i * 4], mesh.j[i * 4 + 1], mesh.j[i * 4 + 2], mesh.j[i * 4 + 3]],
    w: [mesh.w[i * 4], mesh.w[i * 4 + 1], mesh.w[i * 4 + 2], mesh.w[i * 4 + 3]],
  };
}

/**
 * Split every triangle that straddles `field(v) = 0` so no triangle crosses
 * the line afterwards. New vertices sit exactly on the line, are shared by
 * both sides, and carry interpolated normals, UVs and blended skin weights.
 * `field` receives { p, n, j, w } and returns a number.
 */
export function cut(mesh, field) {
  const g = growable(mesh);
  const values = [];
  const count = () => g.pos.length / 3;
  const valueAt = (i) => {
    if (values[i] === undefined) {
      const v = field(vertexOf(g, i));
      values[i] = Math.abs(v) < 1e-9 ? 1e-9 : v;
    }
    return values[i];
  };
  const cache = new Map();
  const crossing = (a, b) => {
    const key = a < b ? `${a}:${b}` : `${b}:${a}`;
    const hit = cache.get(key);
    if (hit !== undefined) return hit;
    const va = valueAt(a);
    const vb = valueAt(b);
    const t = va / (va - vb);
    const i = count();
    for (let k = 0; k < 3; k++) g.pos.push(g.pos[a * 3 + k] + (g.pos[b * 3 + k] - g.pos[a * 3 + k]) * t);
    const n = [0, 1, 2].map((k) => g.nrm[a * 3 + k] + (g.nrm[b * 3 + k] - g.nrm[a * 3 + k]) * t);
    const len = Math.hypot(...n) || 1;
    for (let k = 0; k < 3; k++) g.nrm.push(n[k] / len);
    if (g.uv) for (let k = 0; k < 2; k++) g.uv.push(g.uv[a * 2 + k] + (g.uv[b * 2 + k] - g.uv[a * 2 + k]) * t);
    const skin = blendSkin(
      g.j.slice(a * 4, a * 4 + 4),
      g.w.slice(a * 4, a * 4 + 4),
      g.j.slice(b * 4, b * 4 + 4),
      g.w.slice(b * 4, b * 4 + 4),
      t,
    );
    g.j.push(...skin.j);
    g.w.push(...skin.w);
    values[i] = 0;
    cache.set(key, i);
    return i;
  };

  const out = [];
  for (let t = 0; t < mesh.idx.length; t += 3) {
    const tri = [mesh.idx[t], mesh.idx[t + 1], mesh.idx[t + 2]];
    const s = tri.map((i) => Math.sign(valueAt(i)));
    if (s[0] === s[1] && s[1] === s[2]) {
      out.push(...tri);
      continue;
    }
    // Rotate so the lone vertex comes first, keeping the winding.
    const lone = s[0] !== s[1] && s[0] !== s[2] ? 0 : s[1] !== s[0] && s[1] !== s[2] ? 1 : 2;
    const a = tri[lone];
    const b = tri[(lone + 1) % 3];
    const c = tri[(lone + 2) % 3];
    const p = crossing(a, b);
    const q = crossing(a, c);
    out.push(a, p, q, p, b, c, p, c, q);
  }
  return freeze(g, out);
}

export function triangleCentroid(mesh, t) {
  const c = { p: [0, 0, 0], j: [], w: [] };
  const acc = new Map();
  for (let k = 0; k < 3; k++) {
    const i = mesh.idx[t * 3 + k];
    for (let d = 0; d < 3; d++) c.p[d] += mesh.pos[i * 3 + d] / 3;
    for (let s = 0; s < 4; s++) {
      const joint = mesh.j[i * 4 + s];
      const weight = mesh.w[i * 4 + s];
      if (weight > 0) acc.set(joint, (acc.get(joint) ?? 0) + weight / 3);
    }
  }
  const top = [...acc].sort((a, b) => b[1] - a[1]).slice(0, 4);
  c.j = top.map(([joint]) => joint);
  c.w = top.map(([, weight]) => weight);
  return c;
}

/**
 * Keep the triangles `keep(t)` accepts, re-indexed. Returns the submesh and
 * the map from new vertex index to the source vertex.
 */
export function submesh(mesh, keep) {
  const remap = new Map();
  const source = [];
  const idx = [];
  for (let t = 0; t < mesh.idx.length / 3; t++) {
    if (!keep(t)) continue;
    for (let k = 0; k < 3; k++) {
      const i = mesh.idx[t * 3 + k];
      let n = remap.get(i);
      if (n === undefined) {
        n = source.length;
        remap.set(i, n);
        source.push(i);
      }
      idx.push(n);
    }
  }
  const pick = (arr, size) => {
    if (!arr) return null;
    const out = new arr.constructor(source.length * size);
    source.forEach((i, n) => {
      for (let k = 0; k < size; k++) out[n * size + k] = arr[i * size + k];
    });
    return out;
  };
  return {
    mesh: {
      pos: pick(mesh.pos, 3),
      nrm: pick(mesh.nrm, 3),
      uv: pick(mesh.uv, 2),
      j: pick(mesh.j, 4),
      w: pick(mesh.w, 4),
      idx: Uint32Array.from(idx),
    },
    source,
  };
}

/** Collapse vertices that share a position (UV seams) into one id each. */
function weldIds(pos, epsilon = 1e-5) {
  const ids = new Int32Array(pos.length / 3);
  const seen = new Map();
  let next = 0;
  for (let i = 0; i < ids.length; i++) {
    const key = `${Math.round(pos[i * 3] / epsilon)},${Math.round(pos[i * 3 + 1] / epsilon)},${Math.round(pos[i * 3 + 2] / epsilon)}`;
    let id = seen.get(key);
    if (id === undefined) {
      id = next++;
      seen.set(key, id);
    }
    ids[i] = id;
  }
  return { ids, count: next };
}

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a) => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

/** Area-weighted vertex normals over `tris` (flat array of vertex ids). */
export function vertexNormals(points, tris) {
  const n = points.map(() => [0, 0, 0]);
  for (let t = 0; t < tris.length; t += 3) {
    const [a, b, c] = [tris[t], tris[t + 1], tris[t + 2]];
    const f = cross(sub(points[b], points[a]), sub(points[c], points[a]));
    for (const i of [a, b, c]) for (let d = 0; d < 3; d++) n[i][d] += f[d];
  }
  return n.map(norm);
}

/**
 * A garment shell over part of the body: welded, smoothed so muscle does
 * not read through the cloth, pushed out along its own normals, and closed
 * at every open edge with a hem wall back to the skin so a cuff has depth.
 *
 * `offset(p)` is the cloth thickness at a bind-space point. `drape` runs
 * outward-only relaxation afterwards, so cloth spans a hollow (under a bust,
 * between abs, the small of the back) instead of following the skin into
 * it; `maxLift` caps how far it may stand off the skin. Returns a mesh whose
 * vertices keep the body's skin weights.
 */
export function shell(part, { offset, iterations = 12, drape = 0, maxLift = 0.016, clampFloor = null }) {
  const { ids, count } = weldIds(part.pos);
  const firstOf = new Int32Array(count).fill(-1);
  for (let i = 0; i < ids.length; i++) if (firstOf[ids[i]] < 0) firstOf[ids[i]] = i;
  const points = Array.from({ length: count }, (_, v) => {
    const i = firstOf[v];
    return [part.pos[i * 3], part.pos[i * 3 + 1], part.pos[i * 3 + 2]];
  });
  const skinNormals = Array.from({ length: count }, (_, v) => {
    const i = firstOf[v];
    return norm([part.nrm[i * 3], part.nrm[i * 3 + 1], part.nrm[i * 3 + 2]]);
  });
  const tris = Array.from(part.idx, (i) => ids[i]);

  // Edges: interior neighbours and open (boundary) edges.
  const edgeUse = new Map();
  const edgeOwner = new Map();
  for (let t = 0; t < tris.length; t += 3) {
    for (let k = 0; k < 3; k++) {
      const a = tris[t + k];
      const b = tris[t + ((k + 1) % 3)];
      const key = a < b ? `${a}:${b}` : `${b}:${a}`;
      edgeUse.set(key, (edgeUse.get(key) ?? 0) + 1);
      edgeOwner.set(key, { a, b, t });
    }
  }
  const neighbours = points.map(() => new Set());
  const rimNeighbours = points.map(() => new Set());
  const onRim = new Uint8Array(count);
  const rimEdges = [];
  for (const [key, uses] of edgeUse) {
    const { a, b, t } = edgeOwner.get(key);
    neighbours[a].add(b);
    neighbours[b].add(a);
    if (uses === 1) {
      rimNeighbours[a].add(b);
      rimNeighbours[b].add(a);
      onRim[a] = 1;
      onRim[b] = 1;
      rimEdges.push({ a, b, t });
    }
  }

  // Taubin smoothing: shrink-free Laplacian. Rim vertices only slide along
  // their rim, so a hem stays where the cut put it.
  let p = points.map((x) => x.slice());
  const step = (factor) => {
    p = p.map((x, v) => {
      const set = onRim[v] ? rimNeighbours[v] : neighbours[v];
      if (!set.size) return x;
      const avg = [0, 0, 0];
      for (const u of set) for (let d = 0; d < 3; d++) avg[d] += p[u][d] / set.size;
      return x.map((c, d) => c + (avg[d] - c) * factor);
    });
  };
  for (let i = 0; i < iterations; i++) {
    step(0.5);
    step(-0.53);
  }
  // Never below the skin it came from.
  p = p.map((x, v) => {
    const d = dot(sub(x, points[v]), skinNormals[v]);
    return d < 0 ? x.map((c, k) => c - skinNormals[v][k] * d) : x;
  });

  // Drape: a vertex may rise toward its neighbours but never sink, and only
  // slides sideways otherwise, so hollows fill while crests stay put.
  for (let i = 0; i < drape; i++) {
    p = p.map((x, v) => {
      if (onRim[v] || !neighbours[v].size) return x;
      const avg = [0, 0, 0];
      for (const u of neighbours[v]) for (let d = 0; d < 3; d++) avg[d] += p[u][d] / neighbours[v].size;
      const delta = sub(avg, x);
      const n = skinNormals[v];
      const up = dot(delta, n);
      const move = up > 0 ? delta.map((c) => c * 0.6) : delta.map((c, k) => (c - n[k] * up) * 0.3);
      const next = x.map((c, k) => c + move[k]);
      const lift = dot(sub(next, points[v]), n);
      return lift > maxLift ? next.map((c, k) => c - n[k] * (lift - maxLift)) : next;
    });
  }

  const smoothNormals = vertexNormals(p, tris);
  const outer = p.map((x, v) => {
    const o = offset(points[v]);
    const y = x.map((c, k) => c + smoothNormals[v][k] * o);
    if (clampFloor !== null && y[1] < clampFloor) y[1] = clampFloor;
    return y;
  });
  const outerNormals = vertexNormals(outer, tris);

  const pos = [];
  const nrm = [];
  const j = [];
  const w = [];
  const idx = [];
  const pushVertex = (point, normal, v) => {
    const i = firstOf[v];
    pos.push(...point);
    nrm.push(...normal);
    for (let k = 0; k < 4; k++) {
      j.push(part.j[i * 4 + k]);
      w.push(part.w[i * 4 + k]);
    }
    return pos.length / 3 - 1;
  };
  const shellIndex = outer.map((point, v) => pushVertex(point, outerNormals[v], v));
  idx.push(...tris.map((v) => shellIndex[v]));

  // Hem walls: from each open edge of the shell straight back to the skin.
  for (const { a, b, t } of rimEdges) {
    // Keep the owning triangle's winding for the edge direction.
    const tri = [tris[t], tris[t + 1], tris[t + 2]];
    const ia = tri.indexOf(a);
    const [from, to] = tri[(ia + 1) % 3] === b ? [a, b] : [b, a];
    const inner = (v) => points[v].map((c, k) => c + skinNormals[v][k] * 0.002);
    const edge = sub(outer[to], outer[from]);
    const surfaceNormal = norm([
      outerNormals[from][0] + outerNormals[to][0],
      outerNormals[from][1] + outerNormals[to][1],
      outerNormals[from][2] + outerNormals[to][2],
    ]);
    const wallNormal = norm(cross(edge, surfaceNormal));
    const o0 = pushVertex(outer[from], wallNormal, from);
    const o1 = pushVertex(outer[to], wallNormal, to);
    const i0 = pushVertex(inner(from), wallNormal, from);
    const i1 = pushVertex(inner(to), wallNormal, to);
    // Wind the quad so its face normal agrees with wallNormal.
    const face = cross(sub(outer[to], outer[from]), sub(inner(from), outer[from]));
    if (dot(face, wallNormal) >= 0) idx.push(o0, o1, i0, i0, o1, i1);
    else idx.push(o0, i0, o1, i0, i1, o1);
  }

  return {
    pos: Float32Array.from(pos),
    nrm: Float32Array.from(nrm),
    uv: null,
    j: Uint16Array.from(j),
    w: Float32Array.from(w),
    idx: Uint32Array.from(idx),
  };
}

/** Duplicate vertices so every triangle can carry its own per-vertex tag. */
export function splitByTriangleTag(mesh, tagOf) {
  const key = new Map();
  const source = [];
  const tags = [];
  const idx = [];
  for (let t = 0; t < mesh.idx.length / 3; t++) {
    const tag = tagOf(t);
    for (let k = 0; k < 3; k++) {
      const i = mesh.idx[t * 3 + k];
      const id = `${i}:${tag}`;
      let n = key.get(id);
      if (n === undefined) {
        n = source.length;
        key.set(id, n);
        source.push(i);
        tags.push(tag);
      }
      idx.push(n);
    }
  }
  const pick = (arr, size) => {
    if (!arr) return null;
    const out = new arr.constructor(source.length * size);
    source.forEach((i, n) => {
      for (let k = 0; k < size; k++) out[n * size + k] = arr[i * size + k];
    });
    return out;
  };
  return {
    mesh: {
      pos: pick(mesh.pos, 3),
      nrm: pick(mesh.nrm, 3),
      uv: pick(mesh.uv, 2),
      j: pick(mesh.j, 4),
      w: pick(mesh.w, 4),
      idx: Uint32Array.from(idx),
    },
    tags: Uint8Array.from(tags),
  };
}

/** Write a typed-array mesh into a glTF-Transform primitive. */
export function writePrimitive(doc, buffer, mesh, extra = {}) {
  const acc = (type, array) => doc.createAccessor().setType(type).setArray(array).setBuffer(buffer);
  const prim = doc
    .createPrimitive()
    .setAttribute("POSITION", acc("VEC3", mesh.pos))
    .setAttribute("NORMAL", acc("VEC3", mesh.nrm))
    .setAttribute("JOINTS_0", acc("VEC4", mesh.j))
    .setAttribute("WEIGHTS_0", acc("VEC4", mesh.w))
    .setIndices(acc("SCALAR", mesh.pos.length / 3 > 65535 ? mesh.idx : Uint16Array.from(mesh.idx)));
  if (mesh.uv) prim.setAttribute("TEXCOORD_0", acc("VEC2", mesh.uv));
  for (const [semantic, { type, array }] of Object.entries(extra)) prim.setAttribute(semantic, acc(type, array));
  return prim;
}

/**
 * Drop triangles with no area and vertices no triangle uses, and give any
 * normal that came out zero a real direction — the validator rejects a
 * non-unit normal, and a GPU shades it black.
 */
export function compact(mesh) {
  const keep = [];
  for (let t = 0; t < mesh.idx.length; t += 3) {
    const [a, b, c] = [mesh.idx[t], mesh.idx[t + 1], mesh.idx[t + 2]];
    const p = (i) => [mesh.pos[i * 3], mesh.pos[i * 3 + 1], mesh.pos[i * 3 + 2]];
    const area = Math.hypot(...cross(sub(p(b), p(a)), sub(p(c), p(a))));
    if (area > 1e-12) keep.push(a, b, c);
  }
  const { mesh: out } = submesh({ ...mesh, idx: Uint32Array.from(keep) }, () => true);
  const faceNormals = vertexNormals(
    Array.from({ length: out.pos.length / 3 }, (_, i) => [out.pos[i * 3], out.pos[i * 3 + 1], out.pos[i * 3 + 2]]),
    Array.from(out.idx),
  );
  for (let i = 0; i < out.nrm.length / 3; i++) {
    const len = Math.hypot(out.nrm[i * 3], out.nrm[i * 3 + 1], out.nrm[i * 3 + 2]);
    const n = len > 1e-6 ? [out.nrm[i * 3] / len, out.nrm[i * 3 + 1] / len, out.nrm[i * 3 + 2] / len] : faceNormals[i];
    const safe = Math.hypot(...n) > 1e-6 ? n : [0, 1, 0];
    out.nrm.set(safe, i * 3);
  }
  return out;
}
