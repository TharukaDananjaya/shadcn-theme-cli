import fs from "node:fs/promises";
import path from "node:path";

export type ThemeVars = Record<string, string>;

export type Preset = {
  name: string;
  light: ThemeVars;
  dark: ThemeVars;
};

const PRESETS_DIR = path.resolve(process.cwd(), "presets");

export async function listPresets(): Promise<Array<{ base: string; accent: string }>> {
  // presets/<base>/<accent>.json
  const entries: Array<{ base: string; accent: string }> = [];
  const bases = await safeReaddir(PRESETS_DIR);

  for (const base of bases) {
    const baseDir = path.join(PRESETS_DIR, base);
    const accents = await safeReaddir(baseDir);
    for (const file of accents) {
      if (!file.endsWith(".json")) continue;
      entries.push({ base, accent: file.replace(/\.json$/, "") });
    }
  }

  entries.sort((a, b) => (a.base + a.accent).localeCompare(b.base + b.accent));
  return entries;
}

export async function loadPreset(base: string, accent: string): Promise<Preset> {
  const file = path.join(PRESETS_DIR, base, `${accent}.json`);
  const raw = await fs.readFile(file, "utf8");
  const parsed = JSON.parse(raw) as Preset;

  if (!parsed?.light || !parsed?.dark) {
    throw new Error(`Invalid preset JSON: ${file} (missing light/dark)`);
  }
  return parsed;
}

async function safeReaddir(dir: string): Promise<string[]> {
  try {
    return await fs.readdir(dir);
  } catch {
    return [];
  }
}