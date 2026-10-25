import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Document, NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, meshopt, prune, resample, textureCompress } from "@gltf-transform/functions";
import validator from "gltf-validator";
import { MeshoptEncoder } from "meshoptimizer";
import sharp from "sharp";
import { Matrix4, Quaternion, Vector3 } from "three";
import { compact, readPrimitive, writePrimitive } from "./mesh.mjs";
import { bake, EMOTE_CLIPS, rigFrom } from "./motion.mjs";
import { GARMENTS, SOLE, tailor } from "./outfits.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SOURCE = path.resolve(ROOT, process.env.PAWKET_3D_SOURCE ?? "assets");
const OUT = path.join(ROOT, "public/3d");
const HUMANS = path.join(SOURCE, "human");

export const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  "meshopt.encoder": MeshoptEncoder,
});

export async function readGltf(file) {
  const dir = path.dirname(file);
  const json = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const key of ["images", "textures", "samplers"]) delete json[key];
  for (const material of json.materials ?? []) {
    for (const key of ["normalTexture", "occlusionTexture", "emissiveTexture"]) delete material[key];
    delete material.pbrMetallicRoughness?.baseColorTexture;
    delete material.pbrMetallicRoughness?.metallicRoughnessTexture;
  }
  const resources = {};
  for (const buffer of json.buffers ?? []) resources[buffer.uri] = new Uint8Array(fs.readFileSync(path.join(dir, buffer.uri)));
  return io.readJSON({ json, resources });
}

const BODIES = {
  a: {
    file: "Superhero_Male_FullBody.gltf",
    light: "T_Superhero_Male_Ligh.png",
    normal: "T_Superhero_Male_Normal.png",
    buzz: "Hair_Buzzed",
  },
  b: {
    file: "Superhero_Female_FullBody.gltf",
    light: "T_Superhero_Female_Light_BaseColor.png",
    normal: "T_Superhero_Female_Normal.png",
    buzz: "Hair_BuzzedFemale",
  },
};

const HAIR = {
  hair_parted: "Hair_SimpleParted",
  hair_long: "Hair_Long",
  hair_buns: "Hair_Buns",
  beard: "Hair_Beard",
};
const HAIR_DIR = "hair";

function bindMatrices(skin) {
  const ibm = skin.getInverseBindMatrices();
  return skin.listJoints().map((joint, i) => ({
    name: joint.getName(),
    bind: new Matrix4().fromArray(ibm.getElement(i, [])).invert(),
  }));
}

function sphereCentre(points) {
  const A = Array.from({ length: 4 }, () => [0, 0, 0, 0]);
  const b = [0, 0, 0, 0];
  for (const [x, y, z] of points) {
    const row = [2 * x, 2 * y, 2 * z, 1];
    const rhs = x * x + y * y + z * z;
    for (let r = 0; r < 4; r++) {
      b[r] += row[r] * rhs;
      for (let c = 0; c < 4; c++) A[r][c] += row[r] * row[c];
    }
  }
  for (let i = 0; i < 4; i++) {
    let p = i;
    for (let r = i + 1; r < 4; r++) if (Math.abs(A[r][i]) > Math.abs(A[p][i])) p = r;
    [A[i], A[p]] = [A[p], A[i]];
    [b[i], b[p]] = [b[p], b[i]];
    for (let r = i + 1; r < 4; r++) {
      const f = A[r][i] / A[i][i];
      for (let c = i; c < 4; c++) A[r][c] -= f * A[i][c];
      b[r] -= f * b[i];
    }
  }
  const s = [0, 0, 0, 0];
  for (let i = 3; i >= 0; i--) {
    let acc = b[i];
    for (let c = i + 1; c < 4; c++) acc -= A[i][c] * s[c];
    s[i] = acc / A[i][i];
  }
  const radius = Math.sqrt(s[3] + s[0] ** 2 + s[1] ** 2 + s[2] ** 2);
  return { centre: [s[0], s[1], s[2]], radius };
}

async function texture(doc, file, { size = 1024, name, grey = false } = {}) {
  let img = sharp(file).resize(size, size, { fit: "fill" });
  if (grey) img = img.greyscale();
  const png = await img.png().toBuffer();
  return doc.createTexture(name).setImage(new Uint8Array(png)).setMimeType("image/png");
}

const SKIN_PATCHES = [
  [0.2, 0.2],
  [0.1, 0.55],
  [0.7, 0.7],
  [0.55, 0.1],
];

async function averageColour(file, patches) {
  const img = sharp(file);
  const { width } = await img.metadata();
  const acc = [0, 0, 0];
  let n = 0;
  for (const [u, v] of patches) {
    const { data, info } = await sharp(file)
      .extract({ left: Math.round(u * width), top: Math.round(v * width), width: 48, height: 48 })
      .raw()
      .toBuffer({ resolveWithObject: true });
    for (let i = 0; i < data.length; i += info.channels) {
      for (let k = 0; k < 3; k++) acc[k] += data[i + k];
      n++;
    }
  }
  return "#" + acc.map((c) => Math.round(c / n).toString(16).padStart(2, "0")).join("");
}

function fitOutside(mesh, head, gap) {
  let moved = 0;
  for (let i = 0; i < mesh.pos.length / 3; i++) {
    const p = [mesh.pos[i * 3], mesh.pos[i * 3 + 1], mesh.pos[i * 3 + 2]];
    let best = -1;
    let bestD = Infinity;
    for (let h = 0; h < head.points.length; h++) {
      const q = head.points[h];
      const d = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2;
      if (d < bestD) {
        bestD = d;
        best = h;
      }
    }
    const q = head.points[best];
    const n = head.normals[best];
    const depth = (p[0] - q[0]) * n[0] + (p[1] - q[1]) * n[1] + (p[2] - q[2]) * n[2];
    if (depth < gap) {
      for (let k = 0; k < 3; k++) mesh.pos[i * 3 + k] += n[k] * (gap - depth);
      moved++;
    }
  }
  return moved;
}

function transformMesh(mesh, matrix) {
  const normalMatrix = new Matrix4().copy(matrix).invert().transpose();
  const v = new Vector3();
  for (let i = 0; i < mesh.pos.length / 3; i++) {
    v.fromArray(mesh.pos, i * 3).applyMatrix4(matrix).toArray(mesh.pos, i * 3);
    v.fromArray(mesh.nrm, i * 3).transformDirection(normalMatrix).toArray(mesh.nrm, i * 3);
  }
}

async function buildHuman(key) {
  const spec = BODIES[key];
  const src = await readGltf(path.join(HUMANS, spec.file));
  const srcRoot = src.getRoot();
  const srcSkin = srcRoot.listSkins()[0];
  const joints = bindMatrices(srcSkin);
  const headIndex = joints.findIndex((j) => j.name === "Head");
  const headBind = joints[headIndex].bind;

  const doc = new Document();
  const buffer = doc.createBuffer();
  const scene = doc.createScene("human");
  const top = doc.createNode(`body-${key}`);
  scene.addChild(top);

  const nodeFor = new Map();
  const copyNode = (source) => {
    const node = doc
      .createNode(source.getName())
      .setTranslation(source.getTranslation())
      .setRotation(source.getRotation())
      .setScale(source.getScale());
    nodeFor.set(source, node);
    for (const child of source.listChildren()) if (!child.getMesh()) node.addChild(copyNode(child));
    return node;
  };
  const srcRootJoint = srcSkin.listJoints()[0];
  top.addChild(copyNode(srcRootJoint));

  const meshes = new Map(srcRoot.listNodes().filter((n) => n.getMesh()).map((n) => [n.getName(), n.getMesh()]));
  const eyes = readPrimitive(meshes.get("Eyes").listPrimitives()[0]);
  const sides = { l: [], r: [] };
  for (let i = 0; i < eyes.pos.length / 3; i++) {
    const p = [eyes.pos[i * 3], eyes.pos[i * 3 + 1], eyes.pos[i * 3 + 2]];
    sides[p[0] > 0 ? "l" : "r"].push(p);
  }
  const headNode = [...nodeFor.values()].find((n) => n.getName() === "Head");
  const headRot = new Quaternion();
  headBind.decompose(new Vector3(), headRot, new Vector3());
  const eyeJoints = {};
  for (const side of ["l", "r"]) {
    const { centre, radius } = sphereCentre(sides[side]);
    const local = new Vector3(...centre).applyMatrix4(headBind.clone().invert());
    const node = doc
      .createNode(`eye_${side}`)
      .setTranslation(local.toArray())
      .setRotation(headRot.clone().invert().toArray());
    headNode.addChild(node);
    eyeJoints[side] = { node, bind: new Matrix4().makeTranslation(...centre), radius };
  }

  const skin = doc.createSkin("skin");
  const jointNodes = srcSkin.listJoints().map((j) => nodeFor.get(j));
  const allJoints = [...jointNodes, eyeJoints.l.node, eyeJoints.r.node];
  const eyeIndex = { l: jointNodes.length, r: jointNodes.length + 1 };
  const ibm = new Float32Array(allJoints.length * 16);
  joints.forEach((j, i) => ibm.set(j.bind.clone().invert().toArray(), i * 16));
  ibm.set(eyeJoints.l.bind.clone().invert().toArray(), eyeIndex.l * 16);
  ibm.set(eyeJoints.r.bind.clone().invert().toArray(), eyeIndex.r * 16);
  for (const node of allJoints) skin.addJoint(node);
  skin.setSkeleton(nodeFor.get(srcRootJoint));
  skin.setInverseBindMatrices(doc.createAccessor().setType("MAT4").setArray(ibm).setBuffer(buffer));

  const clips = bake(doc, rigFrom(nodeFor.get(srcRootJoint)));
  console.log(`  ${key} clips: ${clips.join(", ")}`);

  for (let i = 0; i < eyes.pos.length / 3; i++) {
    const side = eyes.pos[i * 3] > 0 ? "l" : "r";
    eyes.j.set([eyeIndex[side], 0, 0, 0], i * 4);
    eyes.w.set([1, 0, 0, 0], i * 4);
  }

  const skinBase = await averageColour(path.join(HUMANS, spec.light), SKIN_PATCHES);
  const skinMat = doc
    .createMaterial("skin")
    .setExtras({ skinBase })
    .setBaseColorTexture(await texture(doc, path.join(HUMANS, spec.light), { name: "skin-light" }))
    .setNormalTexture(await texture(doc, path.join(HUMANS, spec.normal), { name: "skin-normal" }))
    .setMetallicFactor(0)
    .setRoughnessFactor(0.7);
  const eyeMat = doc
    .createMaterial("eyes")
    .setBaseColorTexture(await texture(doc, path.join(HUMANS, "T_Eye_Brown.png"), { size: 256, name: "eyes" }))
    .setMetallicFactor(0)
    .setRoughnessFactor(0.35);
  const hairMat = {
    MI_Hair_1: doc
      .createMaterial("hair_short")
      .setBaseColorTexture(await texture(doc, path.join(HUMANS, HAIR_DIR, "T_Hair_1_BaseColor.png"), { size: 512, name: "hair-short", grey: true }))
      .setMetallicFactor(0)
      .setRoughnessFactor(0.8),
    MI_Hair_2: doc
      .createMaterial("hair_long")
      .setBaseColorTexture(await texture(doc, path.join(HUMANS, HAIR_DIR, "T_Hair_2_BaseColor.png"), { size: 512, name: "hair-long", grey: true }))
      .setMetallicFactor(0)
      .setRoughnessFactor(0.8),
  };

  const addMesh = (name, mesh, material, extra) => {
    const prim = writePrimitive(doc, buffer, extra ? mesh : compact(mesh), extra).setMaterial(material);
    // glTF ignores a skinned mesh's parent transforms: root nodes only.
    const node = doc.createNode(name).setMesh(doc.createMesh(name).addPrimitive(prim)).setSkin(skin);
    scene.addChild(node);
    return node;
  };

  const bodyMeshName = [...meshes.keys()].find((n) => n.startsWith("Super"));
  const body = readPrimitive(meshes.get(bodyMeshName).listPrimitives()[0]);
  const brows = readPrimitive(meshes.get("Eyebrows").listPrimitives()[0]);
  const browMaterial = meshes.get("Eyebrows").listPrimitives()[0].getMaterial().getName();

  const jointAt = (name) => {
    const found = joints.find((j) => j.name === name);
    return new Vector3().setFromMatrixPosition(found.bind).toArray();
  };
  const tailored = tailor(body, jointAt);
  addMesh("body", tailored.body, skinMat, {
    _COVER: { type: "SCALAR", array: tailored.cover },
  }).setExtras({ cover: GARMENTS, sole: SOLE });
  addMesh("eyes", eyes, eyeMat);
  addMesh("brows", brows, hairMat[browMaterial]);

  const cloth = {
    top: doc.createMaterial("cloth_top").setBaseColorFactor([0.48, 0.64, 0.93, 1]).setMetallicFactor(0).setRoughnessFactor(0.9).setDoubleSided(true),
    bottom: doc.createMaterial("cloth_bottom").setBaseColorFactor([0.33, 0.3, 0.27, 1]).setMetallicFactor(0).setRoughnessFactor(0.9).setDoubleSided(true),
    shoes: doc.createMaterial("cloth_shoes").setBaseColorFactor([0.08, 0.06, 0.05, 1]).setMetallicFactor(0).setRoughnessFactor(0.8).setDoubleSided(true),
    sole: doc.createMaterial("sole").setBaseColorFactor([1, 0.98, 0.95, 1]).setMetallicFactor(0).setRoughnessFactor(0.8).setDoubleSided(true),
  };
  for (const [name, parts] of Object.entries(tailored.garments)) {
    const slot = name.split("_")[0];
    const node = addMesh(name, parts.upper, cloth[slot]);
    if (parts.sole) node.getMesh().addPrimitive(writePrimitive(doc, buffer, compact(parts.sole)).setMaterial(cloth.sole));
    const tris = (parts.upper.idx.length + (parts.sole?.idx.length ?? 0)) / 3;
    console.log(`  ${key} ${name}: ${tris} triangles`);
  }

  const head = { points: [], normals: [] };
  for (let i = 0; i < body.pos.length / 3; i++) {
    let w = 0;
    for (let k = 0; k < 4; k++) if (body.j[i * 4 + k] === headIndex) w += body.w[i * 4 + k];
    if (w > 0.5) {
      head.points.push([body.pos[i * 3], body.pos[i * 3 + 1], body.pos[i * 3 + 2]]);
      head.normals.push([body.nrm[i * 3], body.nrm[i * 3 + 1], body.nrm[i * 3 + 2]]);
    }
  }

  for (const [name, file] of Object.entries({ hair_buzzed: spec.buzz, ...HAIR })) {
    const hairDoc = await readGltf(path.join(HUMANS, HAIR_DIR, `${file}.gltf`));
    const hairSkin = hairDoc.getRoot().listSkins()[0];
    const hairHead = bindMatrices(hairSkin).find((j) => j.name === "Head").bind;
    const prim = hairDoc.getRoot().listMeshes()[0].listPrimitives()[0];
    const hair = readPrimitive(prim);
    if (!hairHead.equals(headBind)) {
      transformMesh(hair, headBind.clone().multiply(hairHead.clone().invert()));
      const moved = fitOutside(hair, head, name === "beard" ? 0.0015 : 0.003);
      console.log(`  ${key} ${name}: moved from the other body, ${moved} of ${hair.pos.length / 3} vertices lifted clear`);
    }
    addMesh(name, hair, hairMat[prim.getMaterial().getName()]);
  }

  return { doc };
}

const PETS = {
  cat: {
    file: "animal-cat.glb",
    cells: { c13r3: "#ff8a3d", c1r2: "#b8500f", c15r3: "#2a1e14", c15r2: "#fff8ec" },
  },
  dog: {
    file: "animal-dog.glb",
    cells: { c5r2: "#a45f2a", c5r3: "#6b3d1f", c15r3: "#2a1e14", c3r2: "#fff3e2" },
  },
  bunny: {
    file: "animal-bunny.glb",
    cells: { c5r2: "#fbf8f4", c7r2: "#c7d3f2", c5r3: "#ff9f8f", c15r3: "#2a1e14", c3r2: "#fff3e2" },
  },
};
const PET_CLIPS = ["idle", "walk", "run", "eat", "dance", "gesture-positive", "gesture-negative"];

const srgbToLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const hexToLinear = (hex) => [1, 3, 5].map((i) => srgbToLinear(parseInt(hex.slice(i, i + 2), 16) / 255));

async function buildPet(key) {
  const spec = PETS[key];
  const dir = path.join(SOURCE, "pets");
  const doc = await io.read(path.join(dir, spec.file));
  const root = doc.getRoot();

  const map = await sharp(path.join(dir, "Textures/colormap.png")).raw().toBuffer({ resolveWithObject: true });
  const cellColour = (col, row) => {
    const acc = [0, 0, 0];
    let n = 0;
    for (let y = row * 128 + 4; y < row * 128 + 124; y++)
      for (let x = col * 32 + 4; x < col * 32 + 28; x++) {
        const i = (y * map.info.width + x) * map.info.channels;
        for (let k = 0; k < 3; k++) acc[k] += map.data[i + k];
        n++;
      }
    return acc.map((c) => srgbToLinear(c / n / 255));
  };

  const material = doc.createMaterial(`${key}-coat`).setMetallicFactor(0).setRoughnessFactor(0.9);
  for (const mesh of root.listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const uv = prim.getAttribute("TEXCOORD_0");
      const colours = new Float32Array(uv.getCount() * 4);
      const e = [];
      for (let i = 0; i < uv.getCount(); i++) {
        uv.getElement(i, e);
        const col = Math.min(15, Math.floor(e[0] * 16));
        const row = Math.min(3, Math.floor(e[1] * 4));
        const hex = spec.cells[`c${col}r${row}`];
        colours.set([...(hex ? hexToLinear(hex) : cellColour(col, row)), 1], i * 4);
      }
      prim.setAttribute("COLOR_0", doc.createAccessor().setType("VEC4").setArray(colours).setBuffer(root.listBuffers()[0]));
      prim.setAttribute("TEXCOORD_0", null);
      prim.setAttribute("TANGENT", null);
      prim.setMaterial(material);
    }
  }
  for (const animation of root.listAnimations()) {
    if (!PET_CLIPS.includes(animation.getName())) {
      animation.dispose();
      continue;
    }
    for (const channel of animation.listChannels()) {
      const sampler = channel.getSampler();
      const values = sampler.getOutput().getArray();
      const size = sampler.getOutput().getElementSize();
      let still = true;
      for (let i = size; i < values.length && still; i++) if (Math.abs(values[i] - values[i % size]) > 1e-5) still = false;
      const node = channel.getTargetNode();
      const rest =
        channel.getTargetPath() === "translation"
          ? node.getTranslation()
          : channel.getTargetPath() === "rotation"
            ? node.getRotation()
            : node.getScale();
      const atRest = still && rest.every((v, i) => Math.abs(v - values[i]) < 1e-5);
      if (atRest) {
        channel.dispose();
        sampler.dispose();
      }
    }
  }
  root.listScenes()[0].listChildren()[0].setName("pet");
  return doc;
}

async function buildEmote(clip) {
  const src = await readGltf(path.join(HUMANS, BODIES.a.file));
  const srcRoot = src.getRoot().listSkins()[0].listJoints()[0];
  const doc = new Document();
  doc.createBuffer();
  const scene = doc.createScene("emote");
  const copy = (source) => {
    const node = doc.createNode(source.getName()).setTranslation(source.getTranslation()).setRotation(source.getRotation()).setScale(source.getScale());
    for (const child of source.listChildren()) if (!child.getMesh()) node.addChild(copy(child));
    return node;
  };
  const root = copy(srcRoot);
  scene.addChild(root);
  bake(doc, rigFrom(root), [clip], { rotationsOnly: true });
  return doc;
}

async function finish(doc, file) {
  await doc.transform(prune(), dedup(), resample(), textureCompress({ encoder: sharp, targetFormat: "webp", quality: 88 }));
  // Before compression: the validator cannot read EXT_meshopt_compression buffers.
  const plain = await validator.validateBytes(await io.writeBinary(doc), { maxIssues: 50 });
  if (plain.issues.numErrors > 0) {
    for (const m of plain.issues.messages.filter((m) => m.severity === 0)) console.log(`  ERROR ${m.code} ${m.pointer ?? ""} ${m.message}`);
    throw new Error(`glTF-Validator found errors in ${file} before compression`);
  }
  await doc.transform(meshopt({ encoder: MeshoptEncoder, level: "medium" }));
  const out = path.join(OUT, file);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await io.write(out, doc);
  return out;
}

const BUDGET = { bytes: 5 * 1024 * 1024, triangles: 100_000 };

async function check(file) {
  const bytes = new Uint8Array(fs.readFileSync(file));
  const report = await validator.validateBytes(bytes, { maxIssues: 50 });
  const { numErrors, numWarnings, messages } = report.issues;
  const json = JSON.parse(Buffer.from(bytes.slice(20, 20 + new DataView(bytes.buffer).getUint32(12, true))).toString("utf8"));
  const triangles = (json.meshes ?? []).reduce(
    (sum, mesh) => sum + mesh.primitives.reduce((t, p) => t + (p.indices !== undefined ? json.accessors[p.indices].count / 3 : 0), 0),
    0,
  );
  const clips = (json.animations ?? []).map((a) => a.name);
  const line = `${path.relative(ROOT, file)}  ${(bytes.length / 1024).toFixed(0)} KB  ${triangles} tris  ${clips.length} clips  validator: ${numErrors} errors, ${numWarnings} warnings`;
  console.log(line);
  for (const m of messages.filter((m) => m.severity === 0)) console.log(`  ERROR ${m.code} ${m.pointer ?? ""} ${m.message}`);
  if (numErrors > 0) throw new Error(`glTF-Validator found errors in ${file}`);
  if (bytes.length > BUDGET.bytes || triangles > BUDGET.triangles) throw new Error(`${file} is over budget`);
  return { file: path.relative(ROOT, file), kb: Math.round(bytes.length / 1024), triangles, clips };
}

async function main() {
  await MeshoptEncoder.ready;
  const report = [];
  for (const key of Object.keys(PETS)) {
    const doc = await buildPet(key);
    report.push(await check(await finish(doc, `pets/${key}.glb`)));
  }
  for (const key of Object.keys(BODIES)) {
    console.log(`human ${key}`);
    const { doc } = await buildHuman(key);
    report.push(await check(await finish(doc, `human/body-${key}.glb`)));
  }
  for (const clip of EMOTE_CLIPS) {
    report.push(await check(await finish(await buildEmote(clip), `emotes/${clip.name.toLowerCase().replaceAll(" ", "-")}.glb`)));
  }
  console.table(report.map(({ file, kb, triangles, clips }) => ({ file, kb, triangles, clips: clips.length })));
}

await main();
