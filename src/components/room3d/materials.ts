import {
  BackSide,
  BufferAttribute,
  Color,
  DataTexture,
  Mesh,
  MeshToonMaterial,
  NearestFilter,
  RedFormat,
  ShaderMaterial,
  SkinnedMesh,
  Vector2,
  type BufferGeometry,
  type Material,
  type MeshToonMaterialParameters,
  type Object3D,
  type Texture,
} from "three";

/**
 * Pawket draws flat geometry with an ink outline. In 3D that is toon
 * shading on three steps — shadow, mid, lit — and an inverted-hull outline
 * a fixed number of pixels wide, in the theme's `edge` ink.
 */

let ramp: DataTexture | null = null;

function toonRamp(): DataTexture {
  if (!ramp) {
    ramp = new DataTexture(new Uint8Array([150, 208, 255]), 3, 1, RedFormat);
    ramp.minFilter = NearestFilter;
    ramp.magFilter = NearestFilter;
    ramp.generateMipmaps = false;
    ramp.needsUpdate = true;
  }
  return ramp;
}

/**
 * Gives the GPU back what a piece taken off built for itself: its
 * geometries and materials, each once. The toon ramp and the outline
 * uniforms are shared, and a material's dispose leaves textures and
 * uniforms alone.
 */
export function disposeTree(root: Object3D): void {
  const geometries = new Set<BufferGeometry>();
  const materials = new Set<Material>();
  root.traverse((node) => {
    const mesh = node as Mesh;
    if (!mesh.isMesh) return;
    geometries.add(mesh.geometry);
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) materials.add(material);
  });
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
}

export function toon(params: MeshToonMaterialParameters = {}): MeshToonMaterial {
  return new MeshToonMaterial({ gradientMap: toonRamp(), ...params });
}

/**
 * The body's skin: the pack's one painted skin, recoloured by `uTone` — the
 * ratio of the wanted average tone to the painting's own (both linear) —
 * so blush, shadow and detail survive at every tone. Every triangle a worn
 * garment covers is collapsed in the vertex shader (`_cover` bits from the
 * asset pipeline against `uHidden`), so skin is never drawn under cloth and
 * never pokes through it.
 */
export function skinMaterial(map: Texture, normal: Texture | null) {
  const uniforms = { uTone: { value: new Color(1, 1, 1) }, uHidden: { value: 0 } };
  const material = toon({ map, normalMap: normal ?? undefined });
  if (normal) material.normalScale.set(0.55, 0.55);
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float _cover;\nuniform int uHidden;")
      .replace("#include <project_vertex>", `#include <project_vertex>\n${COLLAPSE}`);
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform vec3 uTone;")
      .replace(
        "#include <map_fragment>",
        `#ifdef USE_MAP
          diffuseColor *= texture2D(map, vMapUv);
          diffuseColor.rgb = min(diffuseColor.rgb * uTone, vec3(1.0));
        #endif`,
      );
  };
  material.customProgramCacheKey = () => "pawket-skin";
  return { material, uniforms };
}

/** Outside clip space, so the whole triangle is culled before it is shaded. */
const COLLAPSE = `if ((int(_cover + 0.5) & uHidden) != 0) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);`;

/* -------------------------------------------------------------- outline */

const OUTLINE_VERTEX = /* glsl */ `
#include <common>
#include <skinning_pars_vertex>
attribute vec3 outlineNormal;
uniform float uWidth;
uniform vec2 uViewport;
#ifdef USE_COVER
attribute float _cover;
uniform int uHidden;
#endif
void main() {
  vec3 objectNormal = outlineNormal;
  #include <skinbase_vertex>
  #include <skinnormal_vertex>
  #include <begin_vertex>
  #include <skinning_vertex>
  #include <project_vertex>
  vec4 clipNormal = projectionMatrix * vec4(normalize(normalMatrix * objectNormal), 0.0);
  if (length(clipNormal.xy) > 1e-5) {
    gl_Position.xy += normalize(clipNormal.xy) * uWidth * 2.0 / uViewport * gl_Position.w;
  }
  #ifdef USE_COVER
  ${COLLAPSE}
  #endif
}
`;

const OUTLINE_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
void main() {
  gl_FragColor = vec4(uColor, 1.0);
  #include <colorspace_fragment>
}
`;

/** Shared by every outline, so the theme ink and pixel size change in one place. */
export const outlineUniforms = {
  uColor: { value: new Color("#2a1e14") },
  uWidth: { value: 1.6 },
  uViewport: { value: new Vector2(1, 1) },
};

/**
 * A normal per position, averaged across split vertices. Extruding along
 * the mesh's own normals would tear the outline open at every hard corner
 * of a cube pet.
 */
function smoothNormals(geometry: BufferGeometry): BufferAttribute {
  const pos = geometry.getAttribute("position");
  const nrm = geometry.getAttribute("normal");
  // Quantised positions hashed to ints: a string key per vertex is the
  // slow part of loading a body with every garment in it.
  const ids = new Int32Array(pos.count);
  const seen = new Map<number, number>();
  const sums: number[] = [];
  for (let i = 0; i < pos.count; i++) {
    const x = Math.round(pos.getX(i) * 1e4);
    const y = Math.round(pos.getY(i) * 1e4);
    const z = Math.round(pos.getZ(i) * 1e4);
    const key = ((x * 73856093) ^ (y * 19349663) ^ (z * 83492791)) | 0;
    let id = seen.get(key);
    if (id === undefined) {
      id = sums.length / 3;
      seen.set(key, id);
      sums.push(0, 0, 0);
    }
    ids[i] = id;
    sums[id * 3] += nrm.getX(i);
    sums[id * 3 + 1] += nrm.getY(i);
    sums[id * 3 + 2] += nrm.getZ(i);
  }
  const out = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const id = ids[i] * 3;
    const len = Math.hypot(sums[id], sums[id + 1], sums[id + 2]) || 1;
    out[i * 3] = sums[id] / len;
    out[i * 3 + 1] = sums[id + 1] / len;
    out[i * 3 + 2] = sums[id + 2] / len;
  }
  return new BufferAttribute(out, 3);
}

/**
 * Give a mesh its ink: a back-faced twin, pushed out along smoothed
 * normals by a fixed pixel width. Skinned meshes share their skeleton, and
 * a body shares its `hidden` uniform with the skin it outlines.
 */
export function addOutline(mesh: Mesh | SkinnedMesh, hidden?: { value: number }): Mesh {
  const geometry = mesh.geometry;
  if (!geometry.getAttribute("outlineNormal")) geometry.setAttribute("outlineNormal", smoothNormals(geometry));
  const material = new ShaderMaterial({
    uniforms: { ...outlineUniforms, ...(hidden ? { uHidden: hidden } : {}) },
    vertexShader: OUTLINE_VERTEX,
    fragmentShader: OUTLINE_FRAGMENT,
    side: BackSide,
    defines: hidden ? { USE_COVER: "" } : {},
  });
  let outline: Mesh;
  if ((mesh as SkinnedMesh).isSkinnedMesh) {
    const skinned = mesh as SkinnedMesh;
    const twin = new SkinnedMesh(geometry, material);
    twin.bind(skinned.skeleton, skinned.bindMatrix);
    outline = twin;
  } else {
    outline = new Mesh(geometry, material);
  }
  outline.name = `${mesh.name}:outline`;
  outline.frustumCulled = mesh.frustumCulled;
  outline.raycast = () => {};
  // A child: it shares the mesh's transform, and hiding the mesh hides it.
  mesh.add(outline);
  return outline;
}
