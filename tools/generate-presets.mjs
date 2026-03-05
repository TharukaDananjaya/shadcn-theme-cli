import fs from "node:fs/promises";
import path from "node:path";
import colors from "tailwindcss/colors";
import { formatCss, oklch, parseHex } from "culori";

const OUT_DIR = path.resolve(process.cwd(), "presets");

// 5 bases (shadcn base palettes)
const BASES = ["neutral", "zinc", "slate", "stone", "gray"];

// 17 accents (shadcn colors page style)
const ACCENTS = [
  "red", "rose", "pink", "fuchsia", "purple", "violet", "indigo",
  "blue", "sky", "cyan", "teal", "emerald", "green", "lime",
  "yellow", "amber", "orange",
];

// Pick which shades to use
const BASE_SHADE = {
  bgLight: 50,
  fgLight: 950,
  cardLight: 0,        // special => white
  cardFgLight: 950,

  bgDark: 950,
  fgDark: 50,
  cardDark: 900,
  cardFgDark: 50,

  borderLight: 200,
  inputLight: 200,
  ringLight: 400,

  borderDark: "alpha10", // special => white 10%
  inputDark: "alpha15",  // special => white 15%
  ringDark: 500,
};

const ACCENT_SHADE = {
  primaryLight: 600,
  ringLight: 500,
  sidebarPrimaryLight: 600,

  primaryDark: 400,
  ringDark: 400,
  sidebarPrimaryDark: 400,
};

// Helpers
function toOklchCss(value) {
  if (typeof value !== "string") {
    throw new Error(`Invalid color value type: ${typeof value}`);
  }

  const v = value.trim();

  // Tailwind v4 already returns OKLCH strings like: "oklch(98.5% 0 0)"
  if (v.startsWith("oklch(")) return v;

  // Pass through other CSS color functions if any
  if (v.startsWith("rgb(") || v.startsWith("hsl(") || v.startsWith("lab(") || v.startsWith("lch(")) {
    return v;
  }

  // Hex -> OKLCH
  if (v.startsWith("#")) {
    const c = parseHex(v);
    if (!c) throw new Error(`Invalid hex: ${v}`);
    return formatCss(oklch(c));
  }

  throw new Error(`Unsupported color format: ${v}`);
}

// Tailwind palette sometimes includes "black/white" as strings; handle those.
function resolveTailwindColor(palette, shade) {
  if (shade === 0) return "#ffffff";
  const v = palette?.[shade];
  if (!v) throw new Error(`Missing shade ${shade} in palette`);
  return v;
}

// Special dark alpha values (like your `oklch(1 0 0 / 10%)`)
// We’ll keep exactly same as your current style.
function alphaOklchWhite(percent) {
  return `oklch(1 0 0 / ${percent}%)`;
}

function getBasePalette(base) {
  const p = colors[base];
  if (!p) throw new Error(`Unknown base palette: ${base}`);
  return p;
}

function getAccentPalette(accent) {
  const p = colors[accent];
  if (!p) throw new Error(`Unknown accent palette: ${accent}`);
  return p;
}

function baseTokens(base) {
  const b = getBasePalette(base);

  // Light
  const background = toOklchCss(resolveTailwindColor(b, BASE_SHADE.bgLight));
  const foreground = toOklchCss(resolveTailwindColor(b, BASE_SHADE.fgLight));
  const card = toOklchCss(resolveTailwindColor(b, BASE_SHADE.cardLight)); // white
  const cardForeground = toOklchCss(resolveTailwindColor(b, BASE_SHADE.cardFgLight));
  const popover = card;
  const popoverForeground = cardForeground;

  const secondary = toOklchCss(resolveTailwindColor(b, 100));
  const secondaryForeground = toOklchCss(resolveTailwindColor(b, 900));

  const muted = toOklchCss(resolveTailwindColor(b, 100));
  const mutedForeground = toOklchCss(resolveTailwindColor(b, 500));

  const accent = toOklchCss(resolveTailwindColor(b, 100));
  const accentForeground = toOklchCss(resolveTailwindColor(b, 900));

  const destructive = toOklchCss(resolveTailwindColor(colors.red, 500));

  const border = toOklchCss(resolveTailwindColor(b, BASE_SHADE.borderLight));
  const input = toOklchCss(resolveTailwindColor(b, BASE_SHADE.inputLight));
  const ring = toOklchCss(resolveTailwindColor(b, BASE_SHADE.ringLight));

  // Dark
  const backgroundDark = toOklchCss(resolveTailwindColor(b, BASE_SHADE.bgDark));
  const foregroundDark = toOklchCss(resolveTailwindColor(b, BASE_SHADE.fgDark));

  const cardDark = toOklchCss(resolveTailwindColor(b, BASE_SHADE.cardDark));
  const cardForegroundDark = toOklchCss(resolveTailwindColor(b, BASE_SHADE.cardFgDark));
  const popoverDark = cardDark;
  const popoverForegroundDark = cardForegroundDark;

  const secondaryDark = toOklchCss(resolveTailwindColor(b, 800));
  const secondaryForegroundDark = toOklchCss(resolveTailwindColor(b, 50));

  const mutedDark = toOklchCss(resolveTailwindColor(b, 800));
  const mutedForegroundDark = toOklchCss(resolveTailwindColor(b, 400));

  const accentDark = toOklchCss(resolveTailwindColor(b, 800));
  const accentForegroundDark = toOklchCss(resolveTailwindColor(b, 50));

  const destructiveDark = toOklchCss(resolveTailwindColor(colors.red, 400));

  const borderDark = alphaOklchWhite(10);
  const inputDark = alphaOklchWhite(15);
  const ringDark = toOklchCss(resolveTailwindColor(b, BASE_SHADE.ringDark));

  // Sidebar uses same base neutrals
  return {
    light: {
      "--background": background,
      "--foreground": foreground,
      "--card": card,
      "--card-foreground": cardForeground,
      "--popover": popover,
      "--popover-foreground": popoverForeground,

      "--secondary": secondary,
      "--secondary-foreground": secondaryForeground,
      "--muted": muted,
      "--muted-foreground": mutedForeground,
      "--accent": accent,
      "--accent-foreground": accentForeground,

      "--destructive": destructive,
      "--border": border,
      "--input": input,
      "--ring": ring,

      "--radius": "0.625rem",

      "--sidebar": toOklchCss(resolveTailwindColor(b, 50)),
      "--sidebar-foreground": toOklchCss(resolveTailwindColor(b, 950)),
      "--sidebar-accent": toOklchCss(resolveTailwindColor(b, 100)),
      "--sidebar-accent-foreground": toOklchCss(resolveTailwindColor(b, 900)),
      "--sidebar-border": border,
      "--sidebar-ring": ring,
    },
    dark: {
      "--background": backgroundDark,
      "--foreground": foregroundDark,
      "--card": cardDark,
      "--card-foreground": cardForegroundDark,
      "--popover": popoverDark,
      "--popover-foreground": popoverForegroundDark,

      "--secondary": secondaryDark,
      "--secondary-foreground": secondaryForegroundDark,
      "--muted": mutedDark,
      "--muted-foreground": mutedForegroundDark,
      "--accent": accentDark,
      "--accent-foreground": accentForegroundDark,

      "--destructive": destructiveDark,
      "--border": borderDark,
      "--input": inputDark,
      "--ring": ringDark,

      "--radius": "0.625rem",

      "--sidebar": toOklchCss(resolveTailwindColor(b, 900)),
      "--sidebar-foreground": toOklchCss(resolveTailwindColor(b, 50)),
      "--sidebar-accent": toOklchCss(resolveTailwindColor(b, 800)),
      "--sidebar-accent-foreground": toOklchCss(resolveTailwindColor(b, 50)),
      "--sidebar-border": borderDark,
      "--sidebar-ring": ringDark,
    },
  };
}

function accentTokens(accent) {
  const a = getAccentPalette(accent);

  const primaryLight = toOklchCss(resolveTailwindColor(a, ACCENT_SHADE.primaryLight));
  const ringLight = toOklchCss(resolveTailwindColor(a, ACCENT_SHADE.ringLight));
  const sidebarPrimaryLight = toOklchCss(resolveTailwindColor(a, ACCENT_SHADE.sidebarPrimaryLight));

  const primaryDark = toOklchCss(resolveTailwindColor(a, ACCENT_SHADE.primaryDark));
  const ringDark = toOklchCss(resolveTailwindColor(a, ACCENT_SHADE.ringDark));
  const sidebarPrimaryDark = toOklchCss(resolveTailwindColor(a, ACCENT_SHADE.sidebarPrimaryDark));

  // Foreground choices: light uses near-white, dark uses near-black.
  // You can tune these later if you want better contrast per-color.
  return {
    light: {
      "--primary": primaryLight,
      "--primary-foreground": "oklch(0.984 0.003 247.858)",
      "--ring": ringLight,

      "--sidebar-primary": sidebarPrimaryLight,
      "--sidebar-primary-foreground": "oklch(0.984 0.003 247.858)",
    },
    dark: {
      "--primary": primaryDark,
      "--primary-foreground": "oklch(0.129 0.042 264.695)",
      "--ring": ringDark,

      "--sidebar-primary": sidebarPrimaryDark,
      "--sidebar-primary-foreground": "oklch(0.129 0.042 264.695)",
    },
  };
}

// Your charts: keep stable (same as your current globals.css)
const CHARTS_LIGHT = {
  "--chart-1": "oklch(0.646 0.222 41.116)",
  "--chart-2": "oklch(0.6 0.118 184.704)",
  "--chart-3": "oklch(0.398 0.07 227.392)",
  "--chart-4": "oklch(0.828 0.189 84.429)",
  "--chart-5": "oklch(0.769 0.188 70.08)",
};

const CHARTS_DARK = {
  "--chart-1": "oklch(0.488 0.243 264.376)",
  "--chart-2": "oklch(0.696 0.17 162.48)",
  "--chart-3": "oklch(0.769 0.188 70.08)",
  "--chart-4": "oklch(0.627 0.265 303.9)",
  "--chart-5": "oklch(0.645 0.246 16.439)",
};

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function writePreset(base, accent, preset) {
  const dir = path.join(OUT_DIR, base);
  await ensureDir(dir);
  const file = path.join(dir, `${accent}.json`);
  await fs.writeFile(file, JSON.stringify(preset, null, 2), "utf8");
}

async function main() {
  await ensureDir(OUT_DIR);

  let count = 0;

  for (const base of BASES) {
    const baseT = baseTokens(base);

    for (const accent of ACCENTS) {
      const accT = accentTokens(accent);

      const preset = {
        name: `${base}-${accent}`,
        light: {
          ...baseT.light,
          ...accT.light,
          ...CHARTS_LIGHT,
        },
        dark: {
          ...baseT.dark,
          ...accT.dark,
          ...CHARTS_DARK,
        },
      };

      await writePreset(base, accent, preset);
      count++;
    }
  }

  console.log(`✅ Generated ${count} presets into ${OUT_DIR}`);
  console.log(`Example: presets/zinc/blue.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});