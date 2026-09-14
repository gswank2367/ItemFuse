import type { CSSProperties } from "react";

export type ItemRarityTheme = {
  key: string;
  label: string;
  color: string;
  rgb: string;
};

const DEFAULT_THEME: ItemRarityTheme = {
  key: "default",
  label: "Item",
  color: "#168cff",
  rgb: "22, 140, 255",
};

const THEMES: Array<{ match: string[]; theme: ItemRarityTheme }> = [
  { match: ["contraband"], theme: { key: "contraband", label: "Contraband", color: "#e4ae39", rgb: "228, 174, 57" } },
  { match: ["extraordinary"], theme: { key: "extraordinary", label: "Extraordinary", color: "#e4ae39", rgb: "228, 174, 57" } },
  { match: ["covert", "master"], theme: { key: "covert", label: "Covert", color: "#eb4b4b", rgb: "235, 75, 75" } },
  { match: ["classified", "superior", "exotic"], theme: { key: "classified", label: "Classified", color: "#d32ce6", rgb: "211, 44, 230" } },
  { match: ["restricted", "exceptional", "remarkable"], theme: { key: "restricted", label: "Restricted", color: "#8847ff", rgb: "136, 71, 255" } },
  { match: ["mil-spec", "mil spec", "distinguished", "high grade"], theme: { key: "milspec", label: "Mil-Spec", color: "#4b69ff", rgb: "75, 105, 255" } },
  { match: ["industrial"], theme: { key: "industrial", label: "Industrial", color: "#5e98d9", rgb: "94, 152, 217" } },
  { match: ["consumer"], theme: { key: "consumer", label: "Consumer", color: "#b0c3d9", rgb: "176, 195, 217" } },
  { match: ["base grade", "stock"], theme: { key: "base", label: "Base Grade", color: "#8ba0b5", rgb: "139, 160, 181" } },
];

export function getItemRarityTheme(rarity: string | null, itemType?: string | null): ItemRarityTheme {
  const source = `${rarity ?? ""} ${itemType ?? ""}`.toLowerCase();
  for (const entry of THEMES) {
    if (entry.match.some((needle) => source.includes(needle))) {
      const actualLabel = rarity?.trim() || entry.theme.label;
      return { ...entry.theme, label: actualLabel };
    }
  }
  return rarity?.trim() ? { ...DEFAULT_THEME, label: rarity.trim() } : DEFAULT_THEME;
}

export type RarityCSSProperties = CSSProperties & {
  "--rarity-color": string;
  "--rarity-rgb": string;
};

export function rarityStyle(theme: ItemRarityTheme): RarityCSSProperties {
  return {
    "--rarity-color": theme.color,
    "--rarity-rgb": theme.rgb,
  };
}
