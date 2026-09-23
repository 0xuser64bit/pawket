/**
 * Expression only. A wearable changes how a pet is described. It has no
 * stat, XP, cooldown, or scoring field, and the type is not allowed to grow
 * one — see the catalog test.
 */
export interface Wearable {
  id: string;
  name: string;
  kind: string;
  icon: "heart" | "star" | "paw" | "spark" | "shield" | "clock";
}

export const WEARABLES: readonly Wearable[] = [
  { id: "wool-scarf", name: "Wool scarf", kind: "Scarf", icon: "heart" },
  { id: "paper-crown", name: "Paper crown", kind: "Crown", icon: "star" },
  { id: "red-collar", name: "Red collar", kind: "Collar", icon: "paw" },
  { id: "star-pin", name: "Star pin", kind: "Pin", icon: "spark" },
  { id: "rain-cape", name: "Rain cape", kind: "Cape", icon: "shield" },
  { id: "nap-ribbon", name: "Nap ribbon", kind: "Ribbon", icon: "clock" },
];

const WEARABLE_IDS = new Set(WEARABLES.map((item) => item.id));

export function isWearableId(value: string): boolean {
  return WEARABLE_IDS.has(value);
}

export function findWearable(id: string | null | undefined): Wearable | undefined {
  if (!id) return undefined;
  return WEARABLES.find((item) => item.id === id);
}
