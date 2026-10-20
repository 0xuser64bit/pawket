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
  type RefObject,
} from "react";
import { Button, PawGlyph, useTheme, useToken, type Feeling, type PetForm, type Sky, type Temper } from "@/components/pk";
import { FlatRoom } from "@/components/home/flat-room";
import type { RoomView } from "@/components/room3d/room-3d";
import type { DirectorStatus } from "@/components/room3d/director";
import type { PetMood, PetSpecies } from "@/lib/game/enums";
import type { ClothColour, PlayerLook } from "@/lib/player/look";
import { DEFAULT_DECOR, DECOR_SLOTS, type RoomDecor } from "@/lib/room/decor";
import type { RoomCue } from "@/lib/room/moments";
import { useReducedMotion } from "@/lib/utils/use-reduced-motion";

/** three.js arrives only with the room, never on the first paint. */
const loadRoom3D = () => import("@/components/room3d/room-3d");
const Room3D = dynamic(loadRoom3D, { ssr: false });

/** Start fetching the 3D room before it is asked for — under a pointer on its switch, say. */
function preloadRoom3D(): void {
  if (canDrawRoom()) void loadRoom3D();
}

/** How long the 3D room takes to fade in over the flat one, or out from over it: `--dur-room`. */
const ROOM_FADE_MS = 420;

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
  peach: "var(--sun-soft)",
  sky: "var(--pool-soft)",
  mint: "var(--sprout-soft)",
  blush: "var(--pet-blush)",
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

/**
 * The room's view, as two segments in the frame's corner: 2D or 3D, the one
 * in use raised. Arrow keys move between them; hovering 3D starts fetching it.
 * Nothing to choose where 3D cannot draw, so then there is no switch.
 */
export function RoomViewSwitch({ mode, state, onMode }: { mode: "3d" | "flat"; state: RoomState; onMode: (mode: "3d" | "flat") => void }) {
  if (state === "unsupported" || state === "failed") return null;
  const views = [
    { value: "flat", label: "2D", name: "Flat room" },
    { value: "3d", label: "3D", name: "3D room" },
  ] as const;
  return (
    <div className="pk-viewswitch" role="radiogroup" aria-label="Room view">
      {views.map((view) => {
        const on = view.value === mode;
        return (
          <button
            key={view.value}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={view.name}
            tabIndex={on ? 0 : -1}
            className="pk-viewswitch__view"
            onClick={() => onMode(view.value)}
            onKeyDown={(event) => {
              if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
              event.preventDefault();
              const next = mode === "3d" ? "flat" : "3d";
              onMode(next);
              (event.currentTarget.parentElement?.querySelector(`[data-view="${next}"]`) as HTMLElement | null)?.focus();
            }}
            data-view={view.value}
            onPointerEnter={view.value === "3d" ? preloadRoom3D : undefined}
            onFocus={view.value === "3d" ? preloadRoom3D : undefined}
          >
            {view.label}
          </button>
        );
      })}
    </div>
  );
}

let webgl: boolean | null = null;

/** Whether this browser can draw the 3D room at all (WebGL 2). */
function canDrawRoom(): boolean {
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
 * the animal: the one control inside the frame is the view switch, in its
 * top corner, where the wall is; everything else lives below the room.
 */
export function Room({
  pet,
  look,
  sky,
  cue,
  description,
  onStatus,
  onState,
  stage = false,
  viewRef,
  corner,
  decor = DEFAULT_DECOR,
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
  /** The whole width of the screen, as Home and the profile draw it. */
  stage?: boolean;
  /** A handle on the 3D room, for a screen that turns it or takes its picture. */
  viewRef?: RefObject<RoomView | null>;
  /** Drawn in the frame's top corner: Home's view switch. */
  corner?: ReactNode;
  /** What stands in the room; the room as it came where it is left out (a visit). */
  decor?: RoomDecor;
}) {
  const [mode] = useRoomMode();
  const canDraw = useCanDraw();
  const reduced = useReducedMotion();
  const theme = useTheme();
  const [failed, setFailed] = useState(false);
  /** The mounted 3D room has drawn its first frame. */
  const [drawn, setDrawn] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [onScreen, setOnScreen] = useState(true);
  const [visible, setVisible] = useState(true);
  const edge = useToken("--edge", "#2a1e14");
  const wall = useToken(sky === "warm" ? "--sun-soft" : sky === "cool" ? "--pool-soft" : "--surface-sunk", "#ffe4cd");
  const [compact, setCompact] = useState(false);
  const frame = useRef<HTMLDivElement>(null);
  const own = useRef<RoomView>(null);
  const view = viewRef ?? own;

  const want3d = mode === "3d" && canDraw === true && !failed;
  // The 3D room mounts as soon as it is wanted, and stays mounted while it
  // fades out, so leaving it is a crossfade rather than a cut. Coming back
  // before it has gone picks it up where it was.
  const [mounted3d, setMounted3d] = useState(want3d);
  if (want3d && !mounted3d) setMounted3d(true);
  // Home re-renders every second for its countdowns; the 3D leaf should not.
  const petKey = pet ? `${pet.species}|${pet.name}|${pet.wearing}|${pet.mood}` : "";
  // The same things, in the same places, are the same room: neither room is dressed again for a re-render.
  const decorKey = DECOR_SLOTS.map((slot) => decor[slot] ?? "").join("|");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const things = useMemo(() => decor, [decorKey]);
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
  const handleReady = useCallback(() => setDrawn(true), []);
  const handleLost = useCallback(() => setFailed(true), []);
  const live = want3d && drawn;
  // With 3D chosen, the flat room is not shown while the 3D one builds: the
  // frame holds a loader instead, so a refresh never flashes the flat room's
  // characters before the 3D ones. The flat room is for a choice of flat,
  // and for a device or a moment where 3D cannot draw.
  const flatShown = mode === "flat" || canDraw === false || failed;
  const state: RoomState =
    mode === "flat" ? "flat" : canDraw === false ? "unsupported" : failed ? "failed" : live ? "live" : "loading";

  useEffect(() => {
    onState?.(state);
  }, [state, onState]);

  // Once it has faded out, the 3D room lets go of its canvas.
  useEffect(() => {
    if (want3d || !mounted3d) return;
    const timer = window.setTimeout(
      () => {
        setMounted3d(false);
        setDrawn(false);
      },
      reduced ? 0 : ROOM_FADE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [want3d, mounted3d, reduced]);

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
    if (!live) return;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      view.current?.nudge(event.key === "ArrowLeft" ? -1 : 1);
    } else if (event.key === "Home" || event.key === "Escape") {
      view.current?.reset();
    }
  }

  // The flat room answers a cue too: the pet hops once (a new key replays it).
  const hop = cue && !live && !reduced ? cue.nonce : 0;
  return (
    <>
    <div
      ref={frame}
      className={[
        "pk-room",
        `pk-sky${sky === "warm" ? "--warm" : sky === "plain" ? "--plain" : ""}`,
        stage && "pk-room--stage",
        !flatShown && "pk-room--3d",
        live && "pk-room--live",
      ]
        .filter(Boolean)
        .join(" ")}
      tabIndex={live ? 0 : undefined}
      onKeyDown={onKeyDown}
      aria-label={live ? `${description} The left and right arrow keys turn the room.` : undefined}
      role={live ? "group" : undefined}
    >
      {/* The flat room, when it is the room: chosen, or where 3D cannot draw.
          Leaving 3D, it is back at once under the canvas fading off it. */}
      <div className="pk-room__flat" aria-hidden={flatShown ? undefined : true}>
        <FlatRoom
          pet={pet ? { form: pet.form, temper: pet.temper, feeling: pet.feeling, wearing: pet.wearing, seed: pet.name } : null}
          colour={PEG_COLOUR[look.topColour]}
          hop={hop}
          hat={look.headwear === "none" ? undefined : look.headwear}
          hatColour={PEG_COLOUR[look.headwearColour]}
          glasses={look.eyewear === "none" ? undefined : look.eyewear}
          decor={things}
        />
      </div>
      {mounted3d ? (
        <div className="pk-room__stage" aria-hidden="true">
          <Guard key={attempt} onError={() => setFailed(true)}>
            <Room3D
              pet={scenePet}
              look={look}
              sky={sky}
              evening={theme === "dark"}
              edge={edge}
              wall={wall}
              decor={things}
              cue={cue}
              reduced={reduced}
              active={want3d && onScreen && visible}
              compact={compact}
              view={view}
              onStatus={handleStatus}
              onReady={handleReady}
              onLost={handleLost}
            />
          </Guard>
        </div>
      ) : null}
      {/* While the 3D room builds, the frame holds the paw and says so; the
          canvas fades in under it as it fades out. */}
      {flatShown ? null : (
        <div className="pk-room__loading" role={live ? undefined : "status"} aria-hidden={live ? true : undefined}>
          <PawGlyph size={56} moving={!live} />
          <span className="caption">Building the room in 3D</span>
        </div>
      )}
      <span className="pk-sr">{description}</span>
      {corner ? <div className="pk-room__corner">{corner}</div> : null}
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
            setDrawn(false);
            setAttempt((n) => n + 1);
          }}
        />
      </div>
    ) : null}
    </>
  );
}
