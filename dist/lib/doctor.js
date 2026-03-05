import fs from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import pc from "picocolors";
async function fileExists(p) {
    try {
        await fs.access(p);
        return true;
    }
    catch {
        return false;
    }
}
async function readIfExists(p) {
    try {
        return await fs.readFile(p, "utf8");
    }
    catch {
        return null;
    }
}
function hasImport(content, cssPath) {
    // handles: import "./globals.css" or import '../css/app.css'
    const escaped = cssPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`import\\s+["']${escaped}["']`, "m");
    return re.test(content);
}
function containsBlock(css, selector) {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`${escaped}\\s*\\{`, "m");
    return re.test(css);
}
function containsAny(css, needles) {
    return needles.every((n) => css.includes(n));
}
export async function runDoctor(detectedCssFile) {
    const messages = [];
    const warnings = [];
    const errors = [];
    // 1) CSS file detection
    if (!detectedCssFile) {
        errors.push("Could not auto-detect CSS file. Use: shadcn-theme apply ... --file <path>");
        return { ok: false, messages, warnings, errors, detectedCssFile: null };
    }
    messages.push(`Detected CSS file: ${pc.cyan(detectedCssFile)}`);
    const css = await readIfExists(detectedCssFile);
    if (!css) {
        errors.push(`CSS file not readable: ${detectedCssFile}`);
        return { ok: false, messages, warnings, errors, detectedCssFile };
    }
    // 2) Token blocks existence
    if (!containsBlock(css, ":root"))
        errors.push("Missing :root { ... } block in CSS.");
    if (!containsBlock(css, ".dark"))
        warnings.push("Missing .dark { ... } block in CSS (dark mode theme may not work).");
    // 3) Shadcn tokens existence
    const requiredVars = ["--primary", "--background", "--ring", "--border"];
    const missingVars = requiredVars.filter((v) => !css.includes(v));
    if (missingVars.length) {
        errors.push(`Missing required CSS variables: ${missingVars.join(", ")}`);
    }
    else {
        messages.push(`Found required variables: ${requiredVars.join(", ")}`);
    }
    // 4) Tailwind v4 mapping check (your @theme inline)
    if (!css.includes("@theme inline")) {
        warnings.push("Missing '@theme inline' mapping. Tailwind utilities like bg-primary may not resolve correctly.");
    }
    else {
        messages.push("Found '@theme inline' mapping.");
    }
    // 5) Check imports (framework detection)
    // ---- Next.js app router
    const nextAppLayout = await fg(["app/layout.{ts,tsx,js,jsx}"], { onlyFiles: true, dot: true });
    const nextPagesApp = await fg(["pages/_app.{ts,tsx,js,jsx}"], { onlyFiles: true, dot: true });
    // ---- Vite/React
    const viteMain = await fg(["src/main.{ts,tsx,js,jsx}"], { onlyFiles: true, dot: true });
    // ---- Laravel + Vite
    const laravelAppJs = await fg(["resources/js/app.{js,jsx,ts,tsx}"], { onlyFiles: true, dot: true });
    const laravelBlade = await fg(["resources/views/**/*.blade.php"], { onlyFiles: true, dot: true, ignore: ["**/vendor/**"] });
    const cssRelCandidates = buildCssImportCandidates(detectedCssFile);
    if (nextAppLayout.length) {
        const p = nextAppLayout[0];
        const content = await readIfExists(p);
        if (!content)
            warnings.push(`Could not read ${p} to verify CSS import.`);
        else {
            const ok = cssRelCandidates.some((rel) => hasImport(content, rel));
            if (!ok) {
                errors.push(`Next.js App Router detected (${p}), but it does not import your CSS. ` +
                    `Expected something like: import "${pc.cyan("./globals.css")}".`);
            }
            else
                messages.push(`Next.js App Router import OK (${p}).`);
        }
    }
    else if (nextPagesApp.length) {
        const p = nextPagesApp[0];
        const content = await readIfExists(p);
        if (!content)
            warnings.push(`Could not read ${p} to verify CSS import.`);
        else {
            const ok = cssRelCandidates.some((rel) => hasImport(content, rel));
            if (!ok) {
                errors.push(`Next.js Pages Router detected (${p}), but it does not import your CSS. ` +
                    `Expected import of the globals CSS file.`);
            }
            else
                messages.push(`Next.js Pages Router import OK (${p}).`);
        }
    }
    else if (viteMain.length) {
        const p = viteMain[0];
        const content = await readIfExists(p);
        if (!content)
            warnings.push(`Could not read ${p} to verify CSS import.`);
        else {
            const ok = cssRelCandidates.some((rel) => hasImport(content, rel));
            if (!ok) {
                errors.push(`Vite/React detected (${p}), but it does not import your CSS file. ` +
                    `Expected something like: import "${pc.cyan("./index.css")}" or import "${pc.cyan("./globals.css")}".`);
            }
            else
                messages.push(`Vite import OK (${p}).`);
        }
    }
    // Laravel import checks (JS + Blade)
    if (laravelAppJs.length) {
        const p = laravelAppJs[0];
        const content = await readIfExists(p);
        if (content) {
            const ok = cssRelCandidates.some((rel) => hasImport(content, rel));
            if (!ok)
                warnings.push(`Laravel app entry found (${p}) but CSS import not detected there (may be included via Blade @vite instead).`);
            else
                messages.push(`Laravel JS entry imports CSS (${p}).`);
        }
    }
    if (laravelBlade.length) {
        // Look for @vite(['resources/css/app.css', ...]) or @vite("resources/css/app.css")
        const needle = normalizePathForBlade(detectedCssFile);
        const found = await findInAnyFile(laravelBlade, (txt) => txt.includes("@vite") && txt.includes(needle));
        if (found)
            messages.push(`Laravel Blade includes CSS via @vite (${found}).`);
        else
            warnings.push(`Laravel Blade @vite include not found for ${needle}. Make sure your Blade includes the CSS build.`);
    }
    // 6) Cache detection
    const caches = [
        ".next",
        "node_modules/.vite",
        ".turbo",
        ".cache",
        "dist",
        "build",
        "public/build"
    ];
    const foundCaches = [];
    for (const c of caches) {
        if (await fileExists(path.resolve(process.cwd(), c)))
            foundCaches.push(c);
    }
    if (foundCaches.length) {
        warnings.push(`Cache folders detected: ${foundCaches.join(", ")}. If changes don't show: restart dev server or run a clean.`);
    }
    // 7) If css has tokens but UI doesn't change, common causes:
    if (!errors.length) {
        messages.push(`If styles still don't update: (1) restart dev server, (2) hard refresh browser, (3) ensure you're editing the imported CSS file.`);
    }
    return {
        ok: errors.length === 0,
        messages,
        warnings,
        errors,
        detectedCssFile
    };
}
function buildCssImportCandidates(cssFile) {
    // We'll generate a few likely relative import strings:
    // - if css file is app/globals.css => ./globals.css (from app/layout)
    // - if resources/css/app.css => ../css/app.css (from resources/js/app)
    const norm = cssFile.replace(/\\/g, "/");
    const fileName = norm.split("/").pop();
    const baseName = `./${fileName}`;
    const candidates = new Set([baseName]);
    // Common known:
    if (norm.endsWith("app/globals.css"))
        candidates.add("./globals.css");
    if (norm.endsWith("styles/globals.css"))
        candidates.add("../styles/globals.css");
    if (norm.endsWith("src/index.css"))
        candidates.add("./index.css");
    if (norm.endsWith("src/globals.css"))
        candidates.add("./globals.css");
    if (norm.endsWith("resources/css/app.css"))
        candidates.add("../css/app.css");
    // Add the raw path too (some projects import from root alias)
    candidates.add(norm);
    return [...candidates];
}
function normalizePathForBlade(cssFile) {
    // Blade typically uses "resources/css/app.css"
    const norm = cssFile.replace(/\\/g, "/");
    // If already starts with resources/, keep.
    if (norm.startsWith("resources/"))
        return norm;
    // otherwise just return last 3 parts if it contains /resources/
    const idx = norm.indexOf("/resources/");
    if (idx >= 0)
        return norm.slice(idx + 1);
    return norm;
}
async function findInAnyFile(files, predicate) {
    const maxFiles = 80; // cap to avoid huge scans
    const limitedFiles = files.slice(0, maxFiles);
    if (limitedFiles.length === 0)
        return null;
    const concurrency = Math.min(8, limitedFiles.length); // small worker pool
    let index = 0;
    let found = null;
    async function worker() {
        while (found === null) {
            const currentIndex = index++;
            if (currentIndex >= limitedFiles.length)
                break;
            const f = limitedFiles[currentIndex];
            const txt = await readIfExists(f);
            if (txt && predicate(txt)) {
                found = f;
                break;
            }
        }
    }
    await Promise.all(Array.from({ length: concurrency }, () => worker()));
    return found;
}
