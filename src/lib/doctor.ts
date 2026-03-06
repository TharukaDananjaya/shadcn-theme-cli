import fs from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import pc from "picocolors";

type DoctorResult = {
  ok: boolean;
  messages: string[];
  warnings: string[];
  errors: string[];
  detectedCssFile: string | null;
};

async function fileExists(p: string) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function readIfExists(p: string) {
  try {
    return await fs.readFile(p, "utf8");
  } catch {
    return null;
  }
}

function hasImport(content: string, cssPath: string) {
  // handles: import "./globals.css" or import '../css/app.css'
  const escaped = cssPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`import\\s+["']${escaped}["']`, "m");
  return re.test(content);
}

function containsBlock(css: string, selector: string) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`${escaped}\\s*\\{`, "m");
  return re.test(css);
}

export async function runDoctor(detectedCssFile: string | null): Promise<DoctorResult> {
  const messages: string[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  // 1) CSS file detection
  if (!detectedCssFile) {
    errors.push("Could not auto-detect CSS file. Re-run with: shadcn-theme doctor --file <path>");
    return { ok: false, messages, warnings, errors, detectedCssFile: null };
  }

  messages.push(`Detected CSS file: ${pc.cyan(detectedCssFile)}`);

  const css = await readIfExists(detectedCssFile);
  if (!css) {
    errors.push(`CSS file not readable: ${detectedCssFile}`);
    return { ok: false, messages, warnings, errors, detectedCssFile };
  }

  // 2) Token blocks existence
  if (!containsBlock(css, ":root")) errors.push("Missing :root { ... } block in CSS.");
  if (!containsBlock(css, ".dark")) warnings.push("Missing .dark { ... } block in CSS (dark mode theme may not work).");

  // 3) Shadcn tokens existence — check for variable *definition* inside :root only
  //    Scanning full CSS would find .dark definitions as false positives,
  //    and @theme inline references like var(--primary) are not definitions.
  const rootBlockMatch = css.match(/:root\s*\{([\s\S]*?)\}/);
  const rootBlockContent = rootBlockMatch ? rootBlockMatch[1] : "";
  const requiredVars = ["--primary", "--background", "--ring", "--border"];
  const missingVars = requiredVars.filter((v) => {
    const pattern = new RegExp(`${v.replace(/[-]/g, "\\$&")}\\s*:`);
    return !pattern.test(rootBlockContent);
  });
  if (missingVars.length) {
    errors.push(`Missing required CSS variables in :root: ${missingVars.join(", ")}`);
  } else {
    messages.push(`Found required variables in :root: ${requiredVars.join(", ")}`);
  }

  // 4) Tailwind setup detection & validation

  // --- Detect Tailwind version from CSS ---
  const isTailwindV4 = css.includes('@import "tailwindcss"') || css.includes("@import 'tailwindcss'");
  const isTailwindV3 = css.includes("@tailwind base") || css.includes("@tailwind utilities") || css.includes("@tailwind components");

  // --- Check for tailwind.config.* (required by v3; optional in v4) ---
  const twConfigCandidates = [
    "tailwind.config.ts",
    "tailwind.config.js",
    "tailwind.config.mjs",
    "tailwind.config.cjs",
  ];
  let twConfigFile: string | null = null;
  let twConfigContent: string | null = null;
  for (const f of twConfigCandidates) {
    const full = path.resolve(process.cwd(), f);
    if (await fileExists(full)) {
      twConfigFile = f;
      twConfigContent = await readIfExists(full);
      break;
    }
  }

  if (twConfigFile) {
    messages.push(`Found Tailwind config: ${twConfigFile}`);
  } else if (isTailwindV3) {
    errors.push(
      "Tailwind v3 detected (via @tailwind directives), but no tailwind.config.* found. " +
      "Create tailwind.config.js or tailwind.config.ts."
    );
  } else if (!isTailwindV4) {
    warnings.push(
      "No tailwind.config.* file found and no Tailwind v4 import ('@import \"tailwindcss\"') detected. " +
      "If using Tailwind v3, add a tailwind.config.js/ts. " +
      "If using Tailwind v4, add '@import \"tailwindcss\"' to your CSS."
    );
  }

  // --- Dark mode strategy validation ---
  const hasDarkCssBlock = containsBlock(css, ".dark");
  if (hasDarkCssBlock) {
    if (twConfigContent) {
      // Tailwind v3: verify darkMode: 'class' in config
      if (/darkMode\s*:\s*['"]class['"]/.test(twConfigContent)) {
        messages.push(`Dark mode 'class' strategy confirmed in ${twConfigFile}.`);
      } else {
        warnings.push(
          `Found .dark { } block in CSS but 'darkMode: "class"' not detected in ${twConfigFile}. ` +
          `Add darkMode: 'class' to your Tailwind config for class-based dark mode.`
        );
      }
    } else if (isTailwindV4) {
      // Tailwind v4: class-based dark mode requires @custom-variant dark in CSS
      if (css.includes("@custom-variant dark")) {
        messages.push("Dark mode class variant configured via '@custom-variant dark'.");
      } else {
        warnings.push(
          "Found .dark { } block in CSS but '@custom-variant dark' not found. " +
          "For Tailwind v4 class-based dark mode, add: " +
          "@custom-variant dark (&:where(.dark, .dark *));"
        );
      }
    }
  }

  // --- @theme inline / bg-primary resolution check (Tailwind v4) ---
  if (!css.includes("@theme inline")) {
    if (isTailwindV4 || (!isTailwindV3 && !twConfigFile)) {
      warnings.push(
        "Missing '@theme inline' block. Tailwind v4 utilities like 'bg-primary' require " +
        "'@theme inline { --color-primary: var(--primary); }' to resolve CSS variables as utilities."
      );
    }
  } else {
    // Validate that @theme inline contains the --color-primary → --primary mapping
    const themeInlineMatch = css.match(/@theme\s+inline\s*\{([\s\S]*?)\}/);
    const themeInlineContent = themeInlineMatch ? themeInlineMatch[1] : "";
    if (themeInlineContent && themeInlineContent.includes("--color-primary")) {
      messages.push("Found '@theme inline' with '--color-primary' mapping (bg-primary should resolve).");
    } else if (themeInlineContent) {
      warnings.push(
        "Found '@theme inline' block but '--color-primary' mapping not detected. " +
        "Add '--color-primary: var(--primary)' inside '@theme inline' for 'bg-primary' to work."
      );
    } else {
      messages.push("Found '@theme inline' mapping.");
    }
  }

  // 5) Check imports (framework detection)
  // ---- Next.js app router
  const nextAppLayout = await fg(["app/layout.{ts,tsx,js,jsx}"], { onlyFiles: true, dot: true });
  const nextPagesApp = await fg(["pages/_app.{ts,tsx,js,jsx}"], { onlyFiles: true, dot: true });

  // ---- Vite/React
  const viteMain = await fg(["src/main.{ts,tsx,js,jsx}"], { onlyFiles: true, dot: true });

  // ---- Laravel + Vite
  const laravelAppJs = await fg(["resources/js/app.{js,jsx,ts,tsx}"], { onlyFiles: true, dot: true });
  const laravelBlade = await fg(
    ["resources/views/**/*.blade.php"],
    { onlyFiles: true, dot: true, ignore: ["**/vendor/**"] }
  );

  const cssRelCandidates = buildCssImportCandidates(detectedCssFile);

  if (nextAppLayout.length) {
    const p = nextAppLayout[0];
    const content = await readIfExists(p);
    if (!content) warnings.push(`Could not read ${p} to verify CSS import.`);
    else {
      const ok = cssRelCandidates.some((rel) => hasImport(content, rel));
      if (!ok) {
        errors.push(
          `Next.js App Router detected (${p}), but it does not import your CSS. ` +
          `Expected something like: import "${pc.cyan("./globals.css")}".`
        );
      } else messages.push(`Next.js App Router import OK (${p}).`);
    }
  } else if (nextPagesApp.length) {
    const p = nextPagesApp[0];
    const content = await readIfExists(p);
    if (!content) warnings.push(`Could not read ${p} to verify CSS import.`);
    else {
      const ok = cssRelCandidates.some((rel) => hasImport(content, rel));
      if (!ok) {
        errors.push(
          `Next.js Pages Router detected (${p}), but it does not import your CSS. ` +
          `Expected import of the globals CSS file.`
        );
      } else messages.push(`Next.js Pages Router import OK (${p}).`);
    }
  } else if (viteMain.length) {
    const p = viteMain[0];
    const content = await readIfExists(p);
    if (!content) warnings.push(`Could not read ${p} to verify CSS import.`);
    else {
      const ok = cssRelCandidates.some((rel) => hasImport(content, rel));
      if (!ok) {
        errors.push(
          `Vite/React detected (${p}), but it does not import your CSS file. ` +
          `Expected something like: import "${pc.cyan("./index.css")}" or import "${pc.cyan("./globals.css")}".`
        );
      } else messages.push(`Vite import OK (${p}).`);
    }
  }

  // Laravel import checks (JS + Blade)
  if (laravelAppJs.length) {
    const p = laravelAppJs[0];
    const content = await readIfExists(p);
    if (content) {
      const ok = cssRelCandidates.some((rel) => hasImport(content, rel));
      if (!ok) warnings.push(`Laravel app entry found (${p}) but CSS import not detected there (may be included via Blade @vite instead).`);
      else messages.push(`Laravel JS entry imports CSS (${p}).`);
    }
  }

  if (laravelBlade.length) {
    // Look for @vite(['resources/css/app.css', ...]) or @vite("resources/css/app.css")
    const needle = normalizePathForBlade(detectedCssFile);
    const found = await findInAnyFile(laravelBlade, (txt) => txt.includes("@vite") && txt.includes(needle));
    if (found) messages.push(`Laravel Blade includes CSS via @vite (${found}).`);
    else warnings.push(`Laravel Blade @vite include not found for ${needle}. Make sure your Blade includes the CSS build.`);
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
    if (await fileExists(path.resolve(process.cwd(), c))) foundCaches.push(c);
  }
  if (foundCaches.length) {
    warnings.push(
      `Cache folders detected: ${foundCaches.join(", ")}. If changes don't show: restart dev server or run a clean.`
    );
  }

  // 7) If css has tokens but UI doesn't change, common causes:
  if (!errors.length) {
    messages.push(
      `If styles still don't update: (1) restart dev server, (2) hard refresh browser, (3) ensure you're editing the imported CSS file.`
    );
  }

  return {
    ok: errors.length === 0,
    messages,
    warnings,
    errors,
    detectedCssFile
  };
}

function buildCssImportCandidates(cssFile: string): string[] {
  // We'll generate a few likely relative import strings:
  // - if css file is app/globals.css => ./globals.css (from app/layout)
  // - if resources/css/app.css => ../css/app.css (from resources/js/app)
  const norm = cssFile.replace(/\\/g, "/");

  const fileName = norm.split("/").pop()!;
  const baseName = `./${fileName}`;

  const candidates = new Set<string>([baseName]);

  // Common known:
  if (norm.endsWith("app/globals.css")) candidates.add("./globals.css");
  if (norm.endsWith("styles/globals.css")) candidates.add("../styles/globals.css");
  if (norm.endsWith("src/index.css")) candidates.add("./index.css");
  if (norm.endsWith("src/globals.css")) candidates.add("./globals.css");
  if (norm.endsWith("resources/css/app.css")) candidates.add("../css/app.css");

  // Add the raw path too (some projects import from root alias)
  candidates.add(norm);

  return [...candidates];
}

function normalizePathForBlade(cssFile: string): string {
  // Blade typically uses "resources/css/app.css"
  const norm = cssFile.replace(/\\/g, "/");
  // If already starts with resources/, keep.
  if (norm.startsWith("resources/")) return norm;
  // otherwise just return last 3 parts if it contains /resources/
  const idx = norm.indexOf("/resources/");
  if (idx >= 0) return norm.slice(idx + 1);
  return norm;
}

async function findInAnyFile(files: string[], predicate: (txt: string) => boolean): Promise<string | null> {
  const maxFiles = 80; // cap to avoid huge scans
  const limitedFiles = files.slice(0, maxFiles);

  if (limitedFiles.length === 0) return null;

  const concurrency = Math.min(8, limitedFiles.length); // small worker pool
  let index = 0;
  let found: string | null = null;

  async function worker() {
    while (found === null) {
      const currentIndex = index++;
      if (currentIndex >= limitedFiles.length) break;
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