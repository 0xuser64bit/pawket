"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { memo, Suspense, use, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type Ref } from "react";
import { Group, Vector3, type Object3D, type PerspectiveCamera } from "three";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import type { Sky } from "@/components/pk";
import { SPECIES_MODEL } from "@/lib/game/appearance";
import type { PetMood, PetSpecies } from "@/lib/game/enums";
import type { PlayerLook } from "@/lib/player/look";
import type { RoomDecor } from "@/lib/room/decor";
import { BAKED } from "@/lib/player/coats";
import type { PhotoPose, RoomCue } from "@/lib/room/moments";
import { Director, type DirectorStatus } from "./director";
import { HumanActor } from "./human";
import { outlineUniforms } from "./materials";
import { PetActor } from "./pet";
import { blobShadow, buildRoom } from "./set";
import { chime } from "@/lib/play/sound";
import { haptic } from "@/lib/native/android";

export interface RoomView {
  nudge: (direction: number) => void;
  reset: () => void;
  snap: () => string | null;
  pose: (id: PhotoPose | null) => Promise<string | null>;
}

export interface Room3DProps {
  pet: { species: PetSpecies; name: string; wearing: string | null; mood: PetMood; coat?: { main: string; second: string } } | null;
  look: PlayerLook;
  sky: Sky;
  evening: boolean;
  edge: string;
  wall: string;
  decor: RoomDecor;
  cue: RoomCue | null;
  reduced: boolean;
  active: boolean;
  compact: boolean;
  view: Ref<RoomView>;
  onStatus: (status: DirectorStatus) => void;
  onReady: () => void;
  onLost: () => void;
}

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);

/** Read in the frame it was drawn: WebGL clears the buffer once the frame is shown. */
function picture(canvas: HTMLCanvasElement): string | null {
  try {
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}
type File = Promise<GLTF> & { status?: "fulfilled" | "rejected"; value?: GLTF; reason?: unknown };
const files = new Map<string, File>();

function load(url: string): Promise<GLTF> {
  let file = files.get(url);
  if (!file) {
    const loading: File = loader.loadAsync(url);
    loading.then(
      (value) => Object.assign(loading, { status: "fulfilled", value }),
      (reason) => {
        files.delete(url);
        Object.assign(loading, { status: "rejected", reason });
      },
    );
    files.set(url, loading);
    file = loading;
  }
  return file;
}

const arrived = (url: string) => files.get(url)?.status === "fulfilled";
const petFile = (species: PetSpecies) => `/3d/pets/${SPECIES_MODEL[species]}.glb`;

function useArrivedPet(pet: Room3DProps["pet"]): Room3DProps["pet"] {
  const [last, setLast] = useState(pet);
  const [, settled] = useState(0);
  const ready = !pet || !last || pet.species === last.species || arrived(petFile(pet.species));
  if (ready && last !== pet) setLast(pet);
  useEffect(() => {
    if (ready || !pet) return;
    let alive = true;
    const settle = () => alive && settled((n) => n + 1);
    load(petFile(pet.species)).then(settle, settle);
    return () => {
      alive = false;
    };
  }, [ready, pet]);
  return ready ? pet : last;
}

const bodyFile = (body: string) => `/3d/human/body-${body}.glb`;

function preloadBody(body: string): void {
  void load(bodyFile(body));
}

export default memo(function Room3D(props: Room3DProps) {
  const { active, reduced, compact, onLost } = props;
  const pet = useArrivedPet(props.pet);
  const [slow, setSlow] = useState(false);
  const onSlow = useCallback(() => setSlow(true), []);
  // R3F loses the context on purpose while unmounting; a layout effect's cleanup runs first, so only
  // a loss while mounted counts.
  const here = useRef(false);
  useLayoutEffect(() => {
    here.current = true;
    return () => {
      here.current = false;
    };
  }, []);
  return (
    <Canvas
      flat
      dpr={compact || slow ? 1 : [1, 1.75]}
      frameloop={active ? (reduced ? "demand" : "always") : "never"}
      camera={{ fov: 30, near: 0.1, far: 40, position: [0, 1.5, 7] }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      style={{ touchAction: "pan-y" }}
      onCreated={({ gl }) => {
        // Reading a shader's log blocks until it compiles, undoing the async compile: development only.
        gl.debug.checkShaderErrors = process.env.NODE_ENV !== "production";
        gl.domElement.style.touchAction = "pan-y";
        gl.domElement.addEventListener("webglcontextlost", (event) => {
          event.preventDefault();
          if (here.current) onLost();
        });
      }}
    >
      <Suspense fallback={null}>
        <Stage key={pet?.species ?? "empty"} {...props} pet={pet} onSlow={slow || compact ? undefined : onSlow} />
      </Suspense>
    </Canvas>
  );
});

function Stage({ pet, look, evening, edge, wall, decor, cue, reduced, compact, view, onStatus, onReady, onSlow }: Room3DProps & { onSlow?: () => void }) {
  const [shown, setShown] = useState(look.body);
  useEffect(() => {
    let alive = true;
    load(bodyFile(look.body)).then(() => alive && setShown(look.body));
    return () => {
      alive = false;
    };
  }, [look.body]);
  const body = use(load(bodyFile(shown)));
  const petGltf = pet ? use(load(petFile(pet.species))) : null;
  const { camera, size, invalidate, gl, scene } = useThree();

  // Dressed as it is built, so its things compile with the scene before the first frame.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const room = useMemo(() => buildRoom(decor), []);
  const world = useMemo(() => new Group(), []);
  const human = useMemo(() => new HumanActor(body.scene, body.animations), [body]);
  const petActor = useMemo(
    () => (petGltf ? new PetActor(petGltf.scene, petGltf.animations, pet?.wearing ?? null) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [petGltf],
  );
  const shadows = useMemo(() => ({ human: blobShadow(0.3), pet: blobShadow(0.3) }), []);

  const ready = useRef(onReady);
  useEffect(() => {
    ready.current = onReady;
  });

  const [director] = useState(
    () =>
      new Director({
        human,
        pet: petActor,
        camera,
        world,
        petName: pet?.name ?? "",
        mood: pet?.mood ?? null,
        reduced,
        windowPoint: new Vector3(room.window.x, room.window.y, room.window.z),
        loadClips: (src) => load(src).then((gltf) => gltf.animations),
      }),
  );
  useEffect(() => director.listen(onStatus), [director, onStatus]);
  useEffect(() => director.setMood(pet?.mood ?? null), [director, pet?.mood]);

  useEffect(() => {
    if (director.human !== human) {
      const old = director.human;
      director.replaceHuman(human);
      old.dispose();
    }
    world.add(human.root);
    invalidate();
    return () => {
      world.remove(human.root);
    };
  }, [director, human, world, invalidate]);

  const dressedAt = useRef({ human: -Infinity, pet: -Infinity });
  const lookSeen = useRef(false);
  useEffect(() => {
    human.wear(look);
    if (lookSeen.current && !reduced) dressedAt.current.human = performance.now() / 1000;
    lookSeen.current = true;
    invalidate();
  }, [human, look, invalidate, reduced]);

  const compiled = useRef(false);
  useEffect(() => {
    let alive = true;
    const done = () => {
      if (!alive) return;
      compiled.current = true;
      invalidate();
    };
    gl.compileAsync(scene, camera).then(done, done);
    return () => {
      alive = false;
    };
  }, [gl, scene, camera, invalidate]);

  const coatMain = pet?.coat?.main;
  const coatSecond = pet?.coat?.second;
  useEffect(() => {
    if (!petActor || !pet) return;
    const baked = BAKED[pet.species];
    petActor.paint(baked, coatMain && coatSecond ? { main: coatMain, second: coatSecond } : baked);
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [petActor, coatMain, coatSecond, invalidate]);

  const wearSeen = useRef(false);
  useEffect(() => {
    petActor?.wear(pet?.wearing ?? null);
    if (wearSeen.current && !reduced) dressedAt.current.pet = performance.now() / 1000;
    wearSeen.current = true;
    invalidate();
  }, [petActor, pet?.wearing, invalidate, reduced]);

  useEffect(() => {
    room.dress(decor);
    invalidate();
  }, [room, decor, invalidate]);

  useEffect(() => {
    room.light(evening, wall);
    outlineUniforms.uColor.value.set(edge);
    invalidate();
  }, [room, evening, wall, edge, invalidate]);

  useEffect(() => {
    director.setReduced(reduced);
    invalidate();
  }, [director, reduced, invalidate]);

  const lastCue = useRef<number | null>(null);
  useEffect(() => {
    if (!cue || cue.nonce === lastCue.current) return;
    lastCue.current = cue.nonce;
    director.play(cue.moment);
    invalidate();
    if (reduced) {
      const timer = window.setInterval(() => {
        invalidate();
        if (!director.busy) window.clearInterval(timer);
      }, 250);
      return () => window.clearInterval(timer);
    }
  }, [cue, director, reduced, invalidate]);

  useEffect(() => () => director.dispose(), [director]);

  const orbit = useRef({ az: 0, el: 0, wantAz: 0, wantEl: 0, lastTouch: -10, drag: null as null | { x: number; y: number; az: number; el: number } });
  const shutter = useRef<((url: string | null) => void) | null>(null);
  useImperativeHandle(view, () => ({
    pose: async (id) => {
      await director.holdPhoto(id);
      if (id) Object.assign(orbit.current, { az: 0, el: 0, wantAz: 0, wantEl: 0 });
      shutter.current?.(null);
      return new Promise<string | null>((resolve) => {
        const take = (url: string | null) => {
          window.clearTimeout(late);
          if (shutter.current === take) shutter.current = null;
          resolve(url);
        };
        const late = window.setTimeout(() => take(null), 2000);
        shutter.current = take;
        invalidate();
      });
    },
    nudge: (direction) => {
      const o = orbit.current;
      o.wantAz = Math.max(-0.45, Math.min(0.45, o.wantAz + direction * 0.14));
      o.lastTouch = performance.now() / 1000;
      invalidate();
    },
    reset: () => {
      orbit.current.wantAz = 0;
      orbit.current.wantEl = 0;
      invalidate();
    },
    snap: () => {
      gl.render(scene, camera);
      return picture(gl.domElement);
    },
  }));
  useEffect(() => {
    const el = gl.domElement;
    const down = (event: PointerEvent) => {
      const o = orbit.current;
      o.drag = { x: event.clientX, y: event.clientY, az: o.wantAz, el: o.wantEl };
    };
    const move = (event: PointerEvent) => {
      const o = orbit.current;
      if (!o.drag) return;
      const w = el.clientWidth || 1;
      o.wantAz = Math.max(-0.45, Math.min(0.45, o.drag.az - ((event.clientX - o.drag.x) / w) * 1.3));
      if (event.pointerType !== "touch") o.wantEl = Math.max(-0.08, Math.min(0.22, o.drag.el + ((event.clientY - o.drag.y) / w) * 0.8));
      o.lastTouch = performance.now() / 1000;
      invalidate();
    };
    const up = () => {
      orbit.current.drag = null;
      orbit.current.lastTouch = performance.now() / 1000;
    };
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [gl, invalidate]);

  useEffect(() => {
    const timer = window.setTimeout(() => preloadBody(shown === "a" ? "b" : "a"), 5000);
    return () => window.clearTimeout(timer);
  }, [shown]);

  const started = useRef(false);
  const base = useMemo(() => new Vector3(), []);
  const pace = useRef({ warm: 0, time: 0, frames: 0 });
  useFrame((state, delta) => {
    if (!compiled.current) return;
    const p = pace.current;
    if (p.warm < 1) p.warm += delta;
    else if (onSlow && !reduced) {
      p.time += delta;
      p.frames += 1;
      if (p.time > 2) {
        if (p.time / p.frames > 1 / 40) onSlow();
        p.time = 0;
        p.frames = 0;
      }
    }
    const dt = reduced ? delta : Math.min(delta, 1 / 20);
    director.update(dt);
    room.tick(new Date());
    const seconds = performance.now() / 1000;
    dressed(director.human.root, seconds - dressedAt.current.human);
    if (petActor) dressed(petActor.root, seconds - dressedAt.current.pet);

    shadows.human.position.set(director.human.root.position.x, 0.014, director.human.root.position.z);
    if (petActor) shadows.pet.position.set(petActor.root.position.x, 0.014, petActor.root.position.z);

    const cam = camera as PerspectiveCamera;
    const o = orbit.current;
    const now = state.clock.elapsedTime;
    if (!o.drag && performance.now() / 1000 - o.lastTouch > 3.5) {
      o.wantAz *= Math.exp(-0.9 * dt);
      o.wantEl *= Math.exp(-0.9 * dt);
    }
    const k = reduced ? 1 : 1 - Math.exp(-6 * dt);
    o.az += (o.wantAz - o.az) * k;
    o.el += (o.wantEl - o.el) * k;
    const drift = reduced ? 0 : Math.sin(now * 0.21) * 0.018;
    const aspect = size.width / Math.max(1, size.height);
    const half = Math.tan((cam.fov * Math.PI) / 360);
    const fit = Math.max(1.22 / half, (compact ? 1.72 : 2.05) / (half * aspect));
    const distance = fit * (1 - 0.16 * director.zoom);
    base.set(-0.12, 0.9, 0.12).lerp(director.focus, 0.4);
    const az = o.az + drift;
    const el = 0.14 + o.el;
    cam.position.set(base.x + Math.sin(az) * Math.cos(el) * distance, base.y + Math.sin(el) * distance, base.z + Math.cos(az) * Math.cos(el) * distance);
    cam.lookAt(base);

    outlineUniforms.uViewport.value.set(state.gl.domElement.width, state.gl.domElement.height);
    outlineUniforms.uWidth.value = 1.5 * state.gl.getPixelRatio();

    state.gl.render(state.scene, state.camera);
    shutter.current?.(picture(state.gl.domElement));
    if (!started.current) {
      started.current = true;
      requestAnimationFrame(() => ready.current());
    }
  }, 1);

  return (
    <>
      <primitive object={room.group} />
      <primitive object={world} />
      <primitive object={shadows.human} />
      {petActor ? (
        <>
          <primitive object={shadows.pet} />
          <primitive
            object={petActor.root}
            onClick={(event: { stopPropagation: () => void }) => {
              event.stopPropagation();
              if (director.boop()) {
                chime("boop");
                haptic("tap");
              }
            }}
            onPointerOver={() => pointAt(gl.domElement, true)}
            onPointerOut={() => pointAt(gl.domElement, false)}
          />
        </>
      ) : null}
    </>
  );
}

const DRESS_SECONDS = 0.46;

function dressed(object: Object3D, age: number): void {
  if (!(age >= 0 && age < DRESS_SECONDS)) {
    if (object.scale.y !== 1) object.scale.setScalar(1);
    return;
  }
  const t = age / DRESS_SECONDS;
  const s = Math.sin(t * Math.PI * 2.5) * (1 - t) * 0.08;
  object.scale.set(1 + s * 0.6, 1 - s, 1 + s * 0.6);
}

function pointAt(el: HTMLElement, pressable: boolean): void {
  el.style.cursor = pressable ? "pointer" : "";
}
