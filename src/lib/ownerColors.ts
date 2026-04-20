export const OWNER_CATEGORY_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  "Investitor": {
    bg: "#EEF4FF",
    color: "#003883",
    border: "#C7D9F8",
  },
  "Pronarët e tokës": {
    bg: "#F0FDF4",
    color: "#166534",
    border: "#BBF7D0",
  },
  "Kompani ndërtimore": {
    bg: "#FFF7ED",
    color: "#9A3412",
    border: "#FED7AA",
  },
};

export function getOwnerCategoryStyle(category: string) {
  return OWNER_CATEGORY_STYLES[category] ?? {
    bg: "#F3F4F6",
    color: "#374151",
    border: "#E5E7EB",
  };
}
