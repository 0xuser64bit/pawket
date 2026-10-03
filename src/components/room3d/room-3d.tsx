"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { memo, Suspense, use, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, type Ref } from "react";
import { Group, Vector3, type PerspectiveCamera } from "three";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import type { Sky } from "@/components/pk";
import { SPECIES_MODEL } from "@/lib/game/appearance";
import type { PetMood, PetSpecies } from "@/lib/game/enums";
import type { PlayerLook } from "@/lib/player/look";
import type { RoomCue } from "@/lib/room/moments";
import { Director, type DirectorStatus } from "./director";
import { HumanActor } from "./human";
import { outlineUniforms } from "./materials";
import { PetActor } from "./pet";
import { blobShadow, buildRoom } from "./set";

export interface RoomView {
  /** Turn the view a step left (-1) or right (1). */
  nudge: (direction: number) => void;
  reset: () => void;
  /** The room as it is now, as a PNG data URL: drawn and read in the same frame. */
  snap: () => string | null;
}

export interface Room3DProps {
  pet: { species: PetSpecies; name: string; wearing: string | null; mood: PetMood } | null;
  look: PlayerLook;
  sky: Sky;
  evening: boolean;
  edge: string;
  /** The pet's sky in the room the player picked: the wall by day. */
  wall: string;
  cue: RoomCue | null;
  reduced: boolean;
  /** False while the room is off screen or the tab is hidden: nothing renders. */
  active: boolean;
  /** Phones render at one device pixel. */
  compact: boolean;
  view: Ref<RoomView>;
  onStatus: (status: DirectorStatus) => void;
  onReady: () => void;
  onLost: () => void;
}

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const files = new Map<string, Promise<GLTF>>();

/** One request per file for the life of the page. */
function load(url: string): Promise<GLTF> {
  if (!files.has(url)) files.set(url, loader.loadAsync(url));
  return files.get(url)!;
}

const bodyFile = (body: string) => `/3d/human/body-${body}.glb`;

/** Fetch a body before the player picks it, so the switch is instant. */
function preloadBody(body: string): void {
  void load(bodyFile(body));
}

/**
 * The one Canvas. Everything else in the room is plain three.js driven from
 * here, so React re-renders only when something about the room changes.
 */
export default memo(function Room3D(props: Room3DProps) {
  const { active, reduced, compact, onLost } = props;
  // A device that cannot keep up gets fewer pixels, once, rather than jank.
  const [slow, setSlow] = useState(false);
  const onSlow = useCallback(() => setSlow(true), []);
  return (
    <Canvas
      flat
      dpr={compact || slow ? 1 : [1, 1.75]}
      frameloop={active ? (reduced ? "demand" : "always") : "never"}
      camera={{ fov: 30, near: 0.1, far: 40, position: [0, 1.5, 7] }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      style={{ touchAction: "pan-y" }}
      onCreated={({ gl }) => {
        gl.domElement.style.touchAction = "pan-y";
        gl.domElement.addEventListener("webglcontextlost", (event) => {
          event.preventDefault();
          onLost();
        });
      }}
    >
      <Suspense fallback={null}>
        <Stage key={props.pet?.species ?? "empty"} {...props} onSlow={slow || compact ? undefined : onSlow} />
      </Suspense>
    </Canvas>
  );
});

function Stage({ pet, look, evening, edge, wall, cue, reduced, compact, view, onStatus, onReady, onSlow }: Room3DProps & { onSlow?: () => void }) {
  // The body on screen changes only once the new one has arrived, so a
  // switch never blanks the room.
  const [shown, setShown] = useState(look.body);
  useEffect(() => {
    let alive = true;
    load(bodyFile(look.body)).then(() => alive && setShown(look.body));
    return () => {
      alive = false;
    };
  }, [look.body]);
  const body = use(load(bodyFile(shown)));
  const petGltf = pet ? use(load(`/3d/pets/${SPECIES_MODEL[pet.species]}.glb`)) : null;
  const { camera, size, invalidate, gl, scene } = useThree();

  const room = useMemo(() => buildRoom(), []);
  const world = useMemo(() => new Group(), []);
  const human = useMemo(() => new HumanActor(body.scene, body.animations), [body]);
  const petActor = useMemo(
    () => (petGltf ? new PetActor(petGltf.scene, petGltf.animations, pet?.wearing ?? null) : null),
    // Wearing changes are applied below without rebuilding the pet.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [petGltf],
  );
  const shadows = useMemo(() => ({ human: blobShadow(0.3), pet: blobShadow(0.3) }), []);

  const ready = useRef(onReady);
  useEffect(() => {
    ready.current = onReady;
  });

  // One director for the life of this stage; it outlives body switches.
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
  // Mood drifts as vitals decay; the pet's life between moments follows it.
  useEffect(() => director.setMood(pet?.mood ?? null), [director, pet?.mood]);

  // A new body (build one ↔ two) takes over the old one's place and clip.
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

  useEffect(() => {
    human.wear(look);
    invalidate();
  }, [human, look, invalidate]);

  // With the cast in the scene, shaders compile off the main path before
  // the first 3D frame, so the flat room stays responsive meanwhile.
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

  useEffect(() => {
    petActor?.wear(pet?.wearing ?? null);
    invalidate();
  }, [petActor, pet?.wearing, invalidate]);

  useEffect(() => {
    room.light(evening, wall);
    outlineUniforms.uColor.value.set(edge);
    invalidate();
  }, [room, evening, wall, edge, invalidate]);

  useEffect(() => {
    director.setReduced(reduced);
    invalidate();
  }, [director, reduced, invalidate]);

  // A cue from the page: a care that was saved, or an emote.
  const lastCue = useRef<number | null>(null);
  useEffect(() => {
    if (!cue || cue.nonce === lastCue.current) return;
    lastCue.current = cue.nonce;
    director.play(cue.moment);
    invalidate();
    if (reduced) {
      // Nothing moves, so the frame loop only needs a few frames a second
      // while a still is held, to know when to let it go.
      const timer = window.setInterval(() => {
        invalidate();
        if (!director.busy) window.clearInterval(timer);
      }, 250);
      return () => window.clearInterval(timer);
    }
  }, [cue, director, reduced, invalidate]);

  useEffect(() => () => director.dispose(), [director]);

  // The view: a gentle drag turns the room, and it springs back.
  const orbit = useRef({ az: 0, el: 0, wantAz: 0, wantEl: 0, lastTouch: -10, drag: null as null | { x: number; y: number; az: number; el: number } });
  useImperativeHandle(view, () => ({
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
      // The drawing buffer is not kept between frames, so draw one and read it before the browser shows it.
      gl.render(scene, camera);
      try {
        return gl.domElement.toDataURL("image/png");
      } catch {
        return null;
      }
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
      // A finger's vertical drag belongs to the page, so only a pointer tilts.
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

  // Once the room is up and quiet, fetch the other build too.
  useEffect(() => {
    const timer = window.setTimeout(() => preloadBody(shown === "a" ? "b" : "a"), 5000);
    return () => window.clearTimeout(timer);
  }, [shown]);

  const started = useRef(false);
  const base = useMemo(() => new Vector3(), []);
  // Two seconds under 40 fps at full resolution, and the Canvas drops to one pixel per CSS pixel.
  // The first second (texture uploads, first draws) does not count.
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

    shadows.human.position.set(director.human.root.position.x, 0.014, director.human.root.position.z);
    if (petActor) shadows.pet.position.set(petActor.root.position.x, 0.014, petActor.root.position.z);

    // Frame the stage for this aspect: the player, the pet and the window.
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
    // A phone frames tighter: the two of them, less of the corners.
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
              director.boop();
            }}
            onPointerOver={() => pointAt(gl.domElement, true)}
            onPointerOut={() => pointAt(gl.domElement, false)}
          />
        </>
      ) : null}
    </>
  );
}

/** The pet is pressable: a pointer over it says so. */
function pointAt(el: HTMLElement, pressable: boolean): void {
  el.style.cursor = pressable ? "pointer" : "";
}
