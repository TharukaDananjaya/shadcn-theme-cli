import fs from "node:fs/promises";
import path from "node:path";
const PRESETS_DIR = path.resolve(process.cwd(), "presets");
export async function listPresets() {
    // presets/<base>/<accent>.json
    const entries = [];
    const bases = await safeReaddir(PRESETS_DIR);
    for (const base of bases) {
        const baseDir = path.join(PRESETS_DIR, base);
        const accents = await safeReaddir(baseDir);
        for (const file of accents) {
            if (!file.endsWith(".json"))
                continue;
            entries.push({ base, accent: file.replace(/\.json$/, "") });
        }
    }
    entries.sort((a, b) => (a.base + a.accent).localeCompare(b.base + b.accent));
    return entries;
}
export async function loadPreset(base, accent) {
    const file = path.join(PRESETS_DIR, base, `${accent}.json`);
    const raw = await fs.readFile(file, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed?.light || !parsed?.dark) {
        throw new Error(`Invalid preset JSON: ${file} (missing light/dark)`);
    }
    return parsed;
}
async function safeReaddir(dir) {
    try {
        return await fs.readdir(dir);
    }
    catch {
        return [];
    }
}
