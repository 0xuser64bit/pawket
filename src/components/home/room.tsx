"use client";

import dynamic from "next/dynamic";
import {
  Component,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Button, useTheme, useToken, type Feeling, type PetForm, type Sky, type Temper } from "@/components/pk";
import { FlatRoom } from "@/components/home/flat-room";
import type { RoomView } from "@/components/room3d/room-3d";
import type { DirectorStatus } from "@/components/room3d/director";
import type { PetMood, PetSpecies } from "@/lib/game/enums";
import type { ClothColour, PlayerLook } from "@/lib/player/look";
import type { RoomCue } from "@/lib/room/moments";
import { useReducedMotion } from "@/lib/utils/use-reduced-motion";

/** three.js arrives only with the room, never on the first paint. */
const Room3D = dynamic(() => import("@/components/room3d/room-3d"), { ssr: false });

/* ----------------------------------------------------- the flat room */

/** The peg doll wears the player's top colour, as a token. */
const PEG_COLOUR: Record<ClothColour, string> = {
  pool: "var(--pool)",
  sun: "var(--sun)",
  sprout: "var(--sprout)",
  copper: "var(--trim-copper)",
  cloth: "var(--trim-cloth)",
  glass: "var(--trim-glass)",
  foil: "var(--trim-foil)",
  ink: "var(--surface-ink)",
  cream: "var(--surface)",
};

/* ------------------------------------------------ device and choice */

const MODE_KEY = "pawket.room";
const modeListeners = new Set<() => void>();

function readMode(): "3d" | "flat" {
  try {
    return window.localStorage.getItem(MODE_KEY) === "flat" ? "flat" : "3d";
  } catch {
    return "3d";
  }
}

/** The player's choice of room on this device: 3D unless they chose flat. */
export function useRoomMode(): ["3d" | "flat", (mode: "3d" | "flat") => void] {
  const mode = useSyncExternalStore(
    (listener) => {
      modeListeners.add(listener);
      return () => modeListeners.delete(listener);
    },
    readMode,
    () => "3d" as const,
  );
  const set = (next: "3d" | "flat") => {
    try {
      if (next === "flat") window.localStorage.setItem(MODE_KEY, "flat");
      else window.localStorage.removeItem(MODE_KEY);
    } catch {
      // Blocked storage: the choice lasts until the page reloads.
    }
    for (const listener of modeListeners) listener();
  };
  return [mode, set];
}

let webgl: boolean | null = null;

/** Whether this browser can draw the 3D room at all (WebGL 2). */
export function canDrawRoom(): boolean {
  if (webgl === null) {
    try {
      webgl = Boolean(document.createElement("canvas").getContext("webgl2"));
    } catch {
      webgl = false;
    }
  }
  return webgl;
}

function useCanDraw(): boolean | null {
  return useSyncExternalStore(
    () => () => {},
    () => canDrawRoom(),
    () => null,
  );
}

/** A missing file or a shader that will not compile lands here, not on the page. */
class Guard extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export type RoomState = "flat" | "loading" | "live" | "failed" | "unsupported";

/* ------------------------------------------------------------ room */

/**
 * The room on Home: the player and their pet in one scene. The 3D room
 * when it can be drawn, the flat room otherwise — and the flat room while
 * the 3D one loads, so there is never an empty frame. Nothing floats over
 * the animal: every control lives below the room.
 */
export function Room({
  pet,
  look,
  sky,
  cue,
  description,
  onStatus,
  onState,
}: {
  pet: {
    species: PetSpecies;
    form: PetForm;
    temper: Temper;
    feeling: Feeling;
    name: string;
    wearing: string | null;
    mood: PetMood;
  } | null;
  look: PlayerLook;
  sky: Sky;
  cue: RoomCue | null;
  description: string;
  onStatus?: (status: DirectorStatus) => void;
  onState?: (state: RoomState) => void;
}) {
  const [mode] = useRoomMode();
  const canDraw = useCanDraw();
  const reduced = useReducedMotion();
  const theme = useTheme();
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [onScreen, setOnScreen] = useState(true);
  const [visible, setVisible] = useState(true);
  const edge = useToken("--edge", "#2a1e14");
  const wall = useToken(sky === "warm" ? "--sun-soft" : sky === "cool" ? "--pool-soft" : "--surface-sunk", "#ffe4cd");
  const [compact, setCompact] = useState(false);
  const frame = useRef<HTMLDivElement>(null);
  const view = useRef<RoomView>(null);

  const want3d = mode === "3d" && canDraw === true && !failed;
  // Home re-renders every second for its countdowns; the 3D leaf should not.
  const petKey = pet ? `${pet.species}|${pet.name}|${pet.wearing}|${pet.mood}` : "";
  const scenePet = useMemo(
    () => (pet ? { species: pet.species, name: pet.name, wearing: pet.wearing, mood: pet.mood } : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [petKey],
  );
  const statusRef = useRef(onStatus);
  useEffect(() => {
    statusRef.current = onStatus;
  });
  const handleStatus = useCallback((status: DirectorStatus) => statusRef.current?.(status), []);
  const handleReady = useCallback(() => setReady(true), []);
  const handleLost = useCallback(() => setFailed(true), []);
  const state: RoomState =
    mode === "flat" ? "flat" : canDraw === false ? "unsupported" : failed ? "failed" : ready ? "live" : "loading";

  useEffect(() => {
    onState?.(state);
  }, [state, onState]);

  // Nothing draws while the room is off screen or the tab is hidden.
  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), { rootMargin: "80px" });
    io.observe(el);
    const onVisibility = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVisibility);
    const media = window.matchMedia("(max-width: 719px), (pointer: coarse)");
    const onMedia = () => setCompact(media.matches);
    onMedia();
    media.addEventListener("change", onMedia);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      media.removeEventListener("change", onMedia);
    };
  }, []);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!(want3d && ready)) return;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      view.current?.nudge(event.key === "ArrowLeft" ? -1 : 1);
    } else if (event.key === "Home" || event.key === "Escape") {
      view.current?.reset();
    }
  }

  const live = want3d && ready;
  // The flat room answers a cue too: the pet hops once (a new key replays it).
  const hop = cue && !live && !reduced ? cue.nonce : 0;
  return (
    <>
    <div
      ref={frame}
      className={["pk-room", `pk-sky${sky === "warm" ? "--warm" : sky === "plain" ? "--plain" : ""}`, live ? "pk-room--live" : ""].join(" ")}
      tabIndex={live ? 0 : undefined}
      onKeyDown={onKeyDown}
      aria-label={live ? `${description} The left and right arrow keys turn the room.` : undefined}
      role={live ? "group" : undefined}
    >
      {live ? null : (
        <FlatRoom
          pet={pet ? { form: pet.form, temper: pet.temper, feeling: pet.feeling, wearing: pet.wearing, seed: pet.name } : null}
          colour={PEG_COLOUR[look.topColour]}
          hop={hop}
        />
      )}
      {want3d ? (
        <div className="pk-room__stage" aria-hidden="true">
          <Guard key={attempt} onError={() => setFailed(true)}>
            <Room3D
              pet={scenePet}
              look={look}
              sky={sky}
              evening={theme === "dark"}
              edge={edge}
              wall={wall}
              cue={cue}
              reduced={reduced}
              active={onScreen && visible}
              compact={compact}
              view={view}
              onStatus={handleStatus}
              onReady={handleReady}
              onLost={handleLost}
            />
          </Guard>
        </div>
      ) : null}
      <span className="pk-sr">{description}</span>
    </div>
    {failed ? (
      <div className="pk-spread">
        <p className="body-sm pk-muted">
          The 3D room stopped drawing, so this is the flat one. {pet ? `${pet.name} and your care are` : "Your room is"} unchanged.
        </p>
        <Button
          label="Try the 3D room again"
          tone="quiet"
          size="sm"
          onClick={() => {
            setFailed(false);
            setReady(false);
            setAttempt((n) => n + 1);
          }}
        />
      </div>
    ) : null}
    </>
  );
}
