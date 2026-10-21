import { CareActionType } from "@/lib/game/enums";

export const PET_CUES = ["look", "happy", "no", "hop", "dance", "eat", "nibble", "lean", "sleep", "fetch", "idle"] as const;
export type PetCue = (typeof PET_CUES)[number];

export const FORMATIONS = ["free", "front", "beside", "bed"] as const;
type Formation = (typeof FORMATIONS)[number];

export const PROPS = ["bowl", "treat", "brush", "ball"] as const;
export type PropKind = (typeof PROPS)[number];

export interface Moment {
  id: string;
  label: string;
  icon: string;
  clips: Array<{ at: number; name: string; src?: string; loop?: boolean }>;
  length?: number;
  formation: Formation;
  facing?: number;
  petFaces?: "player" | "room";
  lookAt?: "pet" | "room";
  pet: Array<{ at: number; cue: PetCue }>;
  prop?: { kind: PropKind; hand: "right" | "both"; from: number; release?: number; to: number };
  contact?: { from: number; to: number; at?: "crown" | "mouth" };
  still: number;
  says: string;
}

export const MOMENTS: readonly Moment[] = [
  {
    id: "wave",
    label: "Wave",
    icon: "paw",
    clips: [{ at: 0, name: "Wave" }],
    formation: "free",
    pet: [
      { at: 0.2, cue: "look" },
      { at: 0.9, cue: "hop" },
      { at: 1.6, cue: "happy" },
    ],
    still: 1.0,
    says: "You wave. {pet} saw.",
  },
  {
    id: "dance",
    label: "Dance",
    icon: "music",
    clips: [{ at: 0, name: "Dance", loop: true }],
    length: 8,
    lookAt: "room",
    formation: "beside",
    facing: 12,
    pet: [{ at: 0, cue: "dance" }],
    still: 1.25,
    says: "You and {pet} dance.",
  },
  {
    id: "pet",
    label: "Pet",
    icon: "heart",
    clips: [{ at: 0, name: "Pet" }],
    formation: "front",
    facing: 62,
    petFaces: "room",
    pet: [
      { at: 1.45, cue: "lean" },
      { at: 4.3, cue: "happy" },
    ],
    contact: { from: 1.45, to: 4.2 },
    still: 2.2,
    says: "You pet {pet}.",
  },
  {
    id: "treat",
    label: "Treat",
    icon: "star",
    clips: [{ at: 0, name: "Treat" }],
    formation: "front",
    facing: 66,
    petFaces: "player",
    pet: [
      { at: 1.5, cue: "nibble" },
      { at: 3.1, cue: "happy" },
    ],
    contact: { from: 1.75, to: 2.65, at: "mouth" },
    prop: { kind: "treat", hand: "right", from: 0.8, to: 2.6 },
    still: 1.9,
    says: "{pet} takes the treat from your hand.",
  },
  {
    id: "cheer",
    label: "Cheer",
    icon: "spark",
    clips: [{ at: 0, name: "Cheer", src: "/3d/emotes/cheer.glb" }],
    lookAt: "room",
    formation: "free",
    pet: [
      { at: 0.2, cue: "look" },
      { at: 0.5, cue: "hop" },
      { at: 1.1, cue: "hop" },
      { at: 1.6, cue: "happy" },
    ],
    still: 0.9,
    says: "You cheer. {pet} bounces.",
  },
  {
    id: "heart",
    label: "Heart",
    icon: "hearts",
    clips: [{ at: 0, name: "Heart", src: "/3d/emotes/heart.glb" }],
    lookAt: "room",
    formation: "free",
    facing: 10,
    pet: [
      { at: 0.3, cue: "look" },
      { at: 0.9, cue: "happy" },
      { at: 1.9, cue: "hop" },
    ],
    still: 1.3,
    says: "You make a heart. {pet} beams.",
  },
  {
    id: "peace",
    label: "Peace",
    icon: "peace",
    clips: [{ at: 0, name: "Peace", src: "/3d/emotes/peace.glb" }],
    lookAt: "room",
    formation: "beside",
    facing: 8,
    pet: [
      { at: 0, cue: "look" },
      { at: 0.5, cue: "happy" },
    ],
    still: 1.1,
    says: "You and {pet} strike a pose.",
  },
  {
    id: "thumbs",
    label: "Nice",
    icon: "thumbs",
    clips: [{ at: 0, name: "Thumbs up", src: "/3d/emotes/thumbs-up.glb" }],
    lookAt: "room",
    formation: "free",
    facing: 10,
    pet: [
      { at: 0.2, cue: "look" },
      { at: 0.7, cue: "happy" },
      { at: 1.5, cue: "hop" },
    ],
    still: 0.9,
    says: "You give {pet} a thumbs up.",
  },
  {
    id: "feed",
    label: "Feed",
    icon: "bowl",
    clips: [{ at: 0, name: "Feed" }],
    formation: "front",
    facing: 86,
    petFaces: "player",
    pet: [
      { at: 2.1, cue: "eat" },
      { at: 5.3, cue: "happy" },
    ],
    prop: { kind: "bowl", hand: "both", from: 0.25, release: 1.9, to: 6.0 },
    still: 2.6,
    says: "You set the bowl down. {pet} eats.",
  },
  {
    id: "brush",
    label: "Brush",
    icon: "heart",
    clips: [{ at: 0, name: "Pet" }],
    formation: "front",
    facing: 62,
    petFaces: "room",
    pet: [
      { at: 1.45, cue: "lean" },
      { at: 4.3, cue: "happy" },
    ],
    prop: { kind: "brush", hand: "right", from: 1.0, to: 4.6 },
    contact: { from: 1.45, to: 4.2 },
    still: 2.2,
    says: "You brush {pet}.",
  },
  {
    id: "fetch",
    label: "Play fetch",
    icon: "ball",
    clips: [
      { at: 0, name: "Throw" },
      { at: 4.6, name: "Clap" },
    ],
    formation: "beside",
    facing: 85,
    pet: [
      { at: 0, cue: "look" },
      { at: 0.8, cue: "fetch" },
      { at: 4.6, cue: "happy" },
    ],
    prop: { kind: "ball", hand: "right", from: 0, release: 0.78, to: 6.0 },
    still: 0.6,
    says: "You throw the ball. {pet} brings it back.",
  },
  {
    id: "rest",
    label: "Rest",
    icon: "clock",
    clips: [{ at: 0, name: "Hush" }],
    lookAt: "room",
    formation: "free",
    facing: 12,
    pet: [
      { at: 0, cue: "look" },
      { at: 0.6, cue: "sleep" },
    ],
    length: 4,
    still: 1.2,
    says: "{pet} curls up on the cushion.",
  },
];

export const EMOTES = ["wave", "dance", "pet", "treat", "cheer", "heart", "peace", "thumbs"] as const;

export interface PhotoPoseSpec {
  value: string;
  label: string;
  icon: string;
  moment: string;
  stage?: Pick<Moment, "formation" | "facing" | "lookAt">;
  still: number;
  pet: { clip: "idle" | "gesture-positive" | "dance"; at: number; hop?: boolean };
}

const TO_CAMERA = { formation: "beside", facing: 8, lookAt: "room" } as const;

export const PHOTO_POSES = [
  { value: "wave", label: "Wave", icon: "paw", moment: "wave", stage: TO_CAMERA, still: 1.0, pet: { clip: "gesture-positive", at: 0.9 } },
  { value: "cheer", label: "Cheer", icon: "spark", moment: "cheer", stage: TO_CAMERA, still: 0.9, pet: { clip: "gesture-positive", at: 0.3, hop: true } },
  { value: "cuddle", label: "Cuddle", icon: "heart", moment: "pet", still: 2.2, pet: { clip: "idle", at: 0.6 } },
  { value: "dance", label: "Dance", icon: "music", moment: "dance", stage: { ...TO_CAMERA, facing: 14 }, still: 0.3, pet: { clip: "dance", at: 1.2, hop: true } },
  { value: "peace", label: "Peace", icon: "peace", moment: "peace", stage: TO_CAMERA, still: 1.1, pet: { clip: "gesture-positive", at: 0.9 } },
  { value: "heart", label: "Heart", icon: "hearts", moment: "heart", stage: TO_CAMERA, still: 1.3, pet: { clip: "idle", at: 0.6 } },
  { value: "thumbs", label: "Nice", icon: "thumbs", moment: "thumbs", stage: TO_CAMERA, still: 0.9, pet: { clip: "gesture-positive", at: 0.7 } },
] as const satisfies readonly PhotoPoseSpec[];
export type PhotoPose = (typeof PHOTO_POSES)[number]["value"];

export function findPhotoPose(id: string): PhotoPoseSpec | undefined {
  return PHOTO_POSES.find((pose) => pose.value === id);
}

export const CARE_MOMENT: Record<CareActionType, string> = {
  [CareActionType.Feed]: "feed",
  [CareActionType.Play]: "fetch",
  [CareActionType.Groom]: "brush",
  [CareActionType.Rest]: "rest",
};

export function findMoment(id: string): Moment | undefined {
  return MOMENTS.find((moment) => moment.id === id);
}

export function momentLength(moment: Moment, clipDuration: (name: string) => number): number {
  if (moment.length !== undefined) return moment.length;
  return Math.max(...moment.clips.map((clip) => clip.at + clipDuration(clip.name)));
}

export function momentSentence(moment: Moment, petName: string): string {
  return moment.says.replaceAll("{pet}", petName);
}

export interface RoomCue {
  moment: string;
  nonce: number;
}
