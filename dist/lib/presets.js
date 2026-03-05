import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "url";
// const PRESETS_DIR = path.resolve(process.cwd(), "presets");
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PRESETS_DIR = path.resolve(__dirname, "../../presets");
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
    // Format A (our CLI default):
    // { name, light: { "--primary": "..." }, dark: { ... } }
    if (parsed?.light && parsed?.dark) {
        return normalizePreset(parsed);
    }
    // Format B (shadcn registry style / generator style):
    // { name, cssVars: { light: { primary: "..." }, dark: { ... } } }
    if (parsed?.cssVars?.light && parsed?.cssVars?.dark) {
        return normalizePreset({
            name: parsed.name ?? `${base}-${accent}`,
            light: addDashes(parsed.cssVars.light),
            dark: addDashes(parsed.cssVars.dark),
        });
    }
    throw new Error(`Invalid preset JSON: ${file} (missing light/dark)`);
}
function addDashes(vars) {
    const out = {};
    for (const [k, v] of Object.entries(vars)) {
        out[k.startsWith("--") ? k : `--${k}`] = v;
    }
    return out;
}
function normalizePreset(p) {
    return {
        name: String(p.name ?? "preset"),
        light: addDashes(p.light),
        dark: addDashes(p.dark),
    };
}
async function safeReaddir(dir) {
    try {
        return await fs.readdir(dir);
    }
    catch {
        return [];
    }
}
