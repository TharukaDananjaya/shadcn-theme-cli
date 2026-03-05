export const GROUPS: Record<string, string[]> = {
  brand: [
    "primary", "primary-foreground",
    "ring",
    "accent", "accent-foreground",
    "secondary", "secondary-foreground"
  ],
  surfaces: [
    "background", "foreground",
    "card", "card-foreground",
    "popover", "popover-foreground",
    "muted", "muted-foreground",
    "border", "input"
  ],
  sidebar: [
    "sidebar", "sidebar-foreground",
    "sidebar-primary", "sidebar-primary-foreground",
    "sidebar-accent", "sidebar-accent-foreground",
    "sidebar-border", "sidebar-ring"
  ],
  charts: ["chart-1", "chart-2", "chart-3", "chart-4", "chart-5"],
  radius: ["radius"]
};

export function parseOnlyKeys(only?: string, group?: string): Set<string> | undefined {
  const keys = new Set<string>();

  if (only) {
    for (const part of only.split(",").map(s => s.trim()).filter(Boolean)) {
      keys.add(part.startsWith("--") ? part : part);
      keys.add(part.startsWith("--") ? part.slice(2) : part);
    }
  }

  if (group) {
    const g = GROUPS[group];
    if (!g) throw new Error(`Unknown group: ${group}. Use one of: ${Object.keys(GROUPS).join(", ")}`);
    for (const k of g) {
      keys.add(k);
      keys.add(`--${k}`);
    }
  }

  return keys.size ? keys : undefined;
}