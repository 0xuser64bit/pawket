export enum PetSpecies {
  LunaCat = "luna_cat",
  MossPup = "moss_pup",
  CloudBun = "cloud_bun",
}

export enum PetPersonality {
  Curious = "curious",
  Cozy = "cozy",
  Brave = "brave",
  Mischief = "mischief",
}

export enum CareActionType {
  Feed = "feed",
  Play = "play",
  Groom = "groom",
  Rest = "rest",
}

export enum PetMood {
  Radiant = "radiant",
  Happy = "happy",
  Okay = "okay",
  Hungry = "hungry",
  Lonely = "lonely",
  Tired = "tired",
  Scruffy = "scruffy",
}

export interface PetStats {
  hunger: number;
  happiness: number;
  energy: number;
  hygiene: number;
}
