# The room in 3D

Home draws the player and their pet in one 3D room. This file is how it is
built, from the supplied asset packs to the frame on screen, and how to add
to it. The design rules it follows are in `docs/DESIGN.md` (“The room in 3D”).

## What ships

- One Canvas, a client-only React Three Fiber leaf
  (`src/components/room3d/room-3d.tsx`), loaded with `next/dynamic` only when
  Home renders a room. three.js never reaches the first paint. With 3D
  chosen, the flat room is not shown while the 3D one builds — a refresh
  never flashes the flat room's characters first: the frame holds the paw
  loader, centred over the room's wall and floor, with "Building the room in
  3D" beneath it. The canvas fades in under the loader as it fades out
  (`--dur-room`, 420ms). Choosing 3D from the flat room, the flat room clears
  to the loader (`--dur-swap`) the same way. Leaving 3D, the flat room is
  back at once underneath and the canvas fades off it before it is let go,
  so coming back within that fade picks the room up where it was. The flat
  room is the room where it is chosen, where WebGL 2 is missing, and after
  a failure. A pointer on the switch starts fetching the chunk early
  (`preloadRoom3D`).
- The canvas's own teardown loses its WebGL context on purpose; a guard set
  in a layout effect (whose cleanup runs before the canvas's) keeps that from
  reading as "the 3D room stopped drawing". A real loss still does.
- A pet of another species takes the stage only once its model has arrived,
  so switching pets keeps the last one in the room until then — never a
  blank frame. A model that has arrived is marked the way `use` reads a
  settled promise, so it is drawn the same frame; one that failed to load is
  forgotten, so "Try the 3D room again" asks again.
- Six GLBs in `public/3d/`, built by `pnpm assets:3d`:

  | File | What | Size | Triangles (all variants) |
  | --- | --- | --- | --- |
  | `human/body-a.glb` | Build one, every hairstyle and garment, 9 clips | ~1.0 MB | ~44.6k |
  | `human/body-b.glb` | Build two, the same | ~1.0 MB | ~46.6k |
  | `pets/cat.glb` | Luna cat, 7 clips | 43 KB | 684 |
  | `pets/dog.glb` | Moss pup, 7 clips | 31 KB | 490 |
  | `pets/bunny.glb` | Cloud bun, 7 clips | 34 KB | 575 |
  | `emotes/cheer.glb` | The Cheer emote: skeleton and one clip, no mesh | 34 KB | 0 |

  A dressed body draws about 25k triangles; the rest are variants switched
  off. Budget per character: under 5 MB and 100k triangles — the pipeline
  fails if a file goes over, or if the Khronos glTF-Validator reports an
  error before or after compression.

## Sources

Both packs are CC0 (Creative Commons Zero): no attribution is required, and
[the repository README](../README.md) credits both anyway. `assets/` keeps only the files the pipeline
reads — 27 files, about 15 MB (set `PAWKET_3D_SOURCE` to read them from
elsewhere):

```
assets/
  pets/    animal-cat.glb, animal-dog.glb, animal-bunny.glb,
           Textures/colormap.png (the GLBs point at it)
  human/   Superhero_Male_FullBody.gltf/.bin, Superhero_Female_FullBody.gltf/.bin,
           each body's light skin and normal map, T_Eye_Brown.png
    hair/  Hair_SimpleParted, Hair_Long, Hair_Buns, Hair_Buzzed,
           Hair_BuzzedFemale, Hair_Beard (.gltf/.bin, rigged to the head bone),
           T_Hair_1_BaseColor.png, T_Hair_2_BaseColor.png
```

Everything else in the packs was dropped; download them again to use more.

- **Kenney, Cube Pets 2.0** — 24 animals, node-animated, eight clips each
  (`static`, `idle`, `walk`, `run`, `eat`, `dance`, `gesture-positive`,
  `gesture-negative`), one gradient colormap. Used: `animal-cat`,
  `animal-dog`, `animal-bunny` (GLB format). The other 21 are not kept.
- **Quaternius, Universal Base Characters (free edition)** — two bodies
  (`Superhero_Male_FullBody`, `Superhero_Female_FullBody`, glTF), a
  65-joint UE-style skeleton (`root → pelvis → spine_01..03 → neck_01 →
  Head`, full fingers), four hairstyles, a beard and two eyebrow sets rigged
  to the head bone. Used: both bodies, their skin, normal and eye textures,
  `Hair_SimpleParted`, `Hair_Long`, `Hair_Buns`, `Hair_Buzzed`,
  `Hair_BuzzedFemale`, `Hair_Beard` (glTF, rigged to head). The FBX and OBJ
  copies, the “origin at 0” hair, the dark skins, roughness maps and the
  Unity/Unreal extras are not kept.

## What the packs did not have, and what the pipeline does about it

| Gap in the source | Resolution |
| --- | --- |
| The Quaternius glTFs point at images that are not in the pack (`*_png.png`) | `readGltf` takes only geometry, skins and material names from them; every texture is read by name, so their own images are never needed |
| No animation at all on the human | Nine clips authored in `scripts/3d/motion.mjs` and baked per body (below) |
| No clothes — the bodies are in underwear | Clothes cut and shelled from each body (`scripts/3d/outfits.mjs`, below) |
| The “Light” and “Dark” body textures have the same skin; they differ only in the underwear | Six skin tones are a shader recolour of the one painted skin, relative to its measured average (stored as `extras.skinBase`) |
| Each hairstyle fits one head | Moved rigidly onto the other head, then lifted clear of its scalp where the bigger skull would poke through |
| No eyelid shapes, no eye bones | An `eye_l`/`eye_r` joint at each eyeball's fitted centre: the room aims them, and squashes them to blink |
| Kenney keys every channel of every part; a gradient colormap | Constant channels dropped; colours become flat vertex colours in the Pawket coats |

### Pets

`buildPet` recolours the three species to the coats `PetArt` draws —
`sun`/`sun-edge` (Luna cat), `trim-copper` with `pet-cocoa` ears (Moss
pup), `pet-cloud` with `pet-blush` inner ears (Cloud bun) — as Daylight hex values, converts the colormap lookup to
vertex colours, drops UVs, tangents, the texture and `static`, and prunes
channels that never leave rest.

### Humans

`buildHuman` rebuilds each body on a clean document:

1. **Skeleton and skin** copied with their rest transforms; two eye joints
   added under `Head`.
2. **Body, eyes, brows**, stripped of the extra UV and colour sets.
3. **Hair**: all four styles and the beard, re-bound to this skeleton and
   fitted (above).
4. **Clothes** (`outfits.mjs`): every garment edge is a line placed from the
   body's own joints — a crew neck, the hem, sleeves at the shoulder, mid
   upper arm or wrist, the waist, shorts above the knee, trousers at the
   ankle, shoe collars. The body is cut exactly along those lines
   (`mesh.mjs` `cut`), each region is shelled — welded, Taubin-smoothed so
   muscle does not read through cloth, then an outward-only “drape” so cloth
   spans hollows instead of following them — pushed out by its thickness and
   closed with a hem wall back to the skin. Shoes are built on a convex-hull
   “last” of the foot (no toes, no arch) with a flat sole cut below. Every
   body triangle carries a `_COVER` bit per garment that covers it, so the
   room collapses skin under worn cloth in the vertex shader: no poke-through
   and no hidden overdraw.
5. **Clips** (`motion.mjs`): key poses in the terms an animator uses —
   pelvis offset, spine and head rotations, hand and foot targets solved with
   two-bone IK and an elbow or knee pole, palm direction, finger curl —
   eased between keys, with continuous “wobble” on top (breath, the wave, a
   dance bounce), sampled at 30 fps and written as ordinary glTF animation.
6. **Textures** to WebP (body 1024 px, hair 512 px, eyes 256 px),
   **geometry** meshopt-compressed and quantised.

### The clips

| Clip | Seconds | Used by |
| --- | --- | --- |
| `Idle` | 6, loops | between moments: weight shift, two breaths, a wandering head |
| `Wave` | 2.8 | Wave |
| `Dance` | 4, loops | Dance (two bars at 120 BPM, the pets' `dance` tempo) |
| `Pet` | 5.6 | Pet, Brush (kneel, three strokes, up) |
| `Treat` | 4.4 | Treat |
| `Feed` | 6.4 | Feed (both knees down, bow to set the bowl, sit up, up) |
| `Throw` | 1.9 | Play fetch (release at 0.78 s) |
| `Clap` | 1.8 | Play fetch |
| `Hush` | 2.8 | Rest |

## The runtime

| File | Job |
| --- | --- |
| `src/components/home/room.tsx` | The Room: 3D or flat, WebGL check, error boundary, context-loss recovery, off-screen pause, keyboard turning |
| `src/components/room3d/room-3d.tsx` | The Canvas, loading, camera, pointer drag, shader pre-compile |
| `src/components/room3d/director.ts` | Staging: life between moments, formations, each moment's timeline |
| `src/components/room3d/human.ts` | The body: dressing, crossfades, look-at, blink, the reaching hand |
| `src/components/room3d/pet.ts` | The pet: walking and running, clips, hop, lean, nibble, sleep, the breath |
| `src/components/room3d/materials.ts` | Toon shading, skin tone and hidden skin, the ink outline |
| `src/components/room3d/set.ts`, `props.ts`, `wearables.ts` | The room, what hands hold, the wardrobe in 3D |
| `src/lib/room/moments.ts` | The moment registry (data) |
| `src/lib/player/` | The player's look, saved on this device |

**Blocking.** The player stands front-left, the pet lives back-right, on a
diagonal: when the pet looks at the player its face turns to the room. For a
moment the pet comes to the player (the player turns, never walks) — in
front for a pat, a treat or the bowl, beside (toward the middle of the room,
never between the player and the camera) for a dance or a throw — and faces
the room while being touched. A free moment (Wave, Cheer, Rest) leaves the
pet where it is, unless the last moment left it at the player's feet; then
it steps back to watch. Wherever the player looks, their face turns no more
than 70° from the camera: a pet behind them is watched over the shoulder.

**Contact.** A pat or a treat is not left to the clip: after the clip is
applied each frame, the right arm is re-solved so the wrist lands on the
pet's real crown (the clip's stroke rides on top) or brings the treat to its
real mouth, and the pet leans into the hand.
Brush uses that same stroke, with its handle gripped in the palm and its
bristles kept down; contact targets the brush head rather than the bare hand.

**Care.** A care button saves first. Only when `saveGuestPet` returns true
does Home cue the moment (`CARE_MOMENT`); a refusal or a storage failure
plays nothing.

**Reduced motion.** The room renders on demand; nothing idles, breathes,
blinks or drifts. A moment is staged at once and held still at its `still`
second for about three seconds, then everyone returns.

**Performance.** DPR 1 on phones (≤ 1.75 elsewhere), no shadow maps (flat
contact shadows), shaders compiled asynchronously before the first frame,
rendering stopped while the room is off screen or the tab hidden, one
request per GLB for the life of the page, and the other build fetched once
the room is quiet.

## Adding an emote

An emote is a clip plus one entry. The clip can live in its own GLB made for
this skeleton (the Quaternius Universal Animation Library targets it). Cheer
ships exactly that way — `public/3d/emotes/cheer.glb` holds only the rig and
its clip, and the room fetches it the first time Cheer is pressed:

```ts
// src/lib/room/moments.ts
{
  id: "cheer",
  label: "Cheer",
  icon: "spark",
  clips: [{ at: 0, name: "Cheer", src: "/3d/emotes/cheer.glb" }],
  formation: "free",
  pet: [{ at: 0.4, cue: "hop" }, { at: 1.2, cue: "happy" }],
  still: 0.8,
  says: "You cheer. {pet} bounces.",
},
```

A clip marked `loop: true` repeats until the moment's `length` (Dance does);
otherwise the player idles once the clips are done. Add its id to `EMOTES`
to put it in the row. Formations, pet cues and props
are implemented once in the room; `moments.test.ts` checks that every clip a
moment names exists in both body GLBs, or in the file its `src` points at,
that cues and props are known, and that times fit the moment — a prop
leaves at least 0.2 s before the end, so it can shrink away.

A clip keyed on this rig plays on either build. Keep it to rotations (as
Cheer does) or author it on the build it will mostly play on: a pelvis
translation baked on one build sits a couple of centimetres off on the
other.

To author a clip the way the shipped ones are, add it to `CLIPS` (inside
each body) or `EMOTE_CLIPS` (its own file) in `scripts/3d/motion.mjs` and
run `pnpm assets:3d`.

## Knobs

`PET_SCALE` (`pet.ts`), `HEAD_SCALE` (`human.ts`), the formation spots and
blocking (`director.ts`), outline width (`room-3d.tsx`), the toon ramp
(`materials.ts`), garment lines and thickness (`outfits.mjs`).
