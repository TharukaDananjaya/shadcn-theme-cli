import { ThemeVars } from "./presets.js";

export type ApplyOptions = {
  selectorLight: string;     // usually ":root"
  selectorDark: string;      // usually ".dark"
  createMissing: boolean;    // Flow 4
  onlyKeys?: Set<string>;    // Flow 6
};

export type ApplyResult = {
  updatedCss: string;
  stats: {
    lightReplaced: number;
    lightAppended: number;
    darkReplaced: number;
    darkAppended: number;
    createdLightBlock: boolean;
    createdDarkBlock: boolean;
  };
};

export function applyThemeToCss(css: string, light: ThemeVars, dark: ThemeVars, opts: ApplyOptions): ApplyResult {
  const filteredLight = filterVars(light, opts.onlyKeys);
  const filteredDark = filterVars(dark, opts.onlyKeys);

  let createdLightBlock = false;
  let createdDarkBlock = false;

  // Ensure blocks exist (Flow 4)
  if (!hasBlock(css, opts.selectorLight)) {
    if (!opts.createMissing) throw new Error(`Missing block: ${opts.selectorLight} { ... }`);
    css = ensureBlock(css, opts.selectorLight);
    createdLightBlock = true;
  }

  if (!hasBlock(css, opts.selectorDark)) {
    if (!opts.createMissing) throw new Error(`Missing block: ${opts.selectorDark} { ... }`);
    css = ensureBlock(css, opts.selectorDark);
    createdDarkBlock = true;
  }

  const lightPatch = patchBlock(css, opts.selectorLight, filteredLight);
  css = lightPatch.updated;

  const darkPatch = patchBlock(css, opts.selectorDark, filteredDark);
  css = darkPatch.updated;

  return {
    updatedCss: css,
    stats: {
      lightReplaced: lightPatch.replaced,
      lightAppended: lightPatch.appended,
      darkReplaced: darkPatch.replaced,
      darkAppended: darkPatch.appended,
      createdLightBlock,
      createdDarkBlock
    }
  };
}

export function extractVarsFromCss(css: string, selector: string): ThemeVars {
  const body = getBlockBody(css, selector);
  const vars: ThemeVars = {};
  const re = /^\s*(--[a-zA-Z0-9-_]+)\s*:\s*([^;]+);\s*$/gm;

  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) vars[m[1]] = m[2].trim();
  return vars;
}

/** ---------- internals ---------- **/

function filterVars(vars: ThemeVars, onlyKeys?: Set<string>): ThemeVars {
  if (!onlyKeys || onlyKeys.size === 0) return vars;
  const out: ThemeVars = {};
  for (const [k, v] of Object.entries(vars)) {
    const keyNoPrefix = k.startsWith("--") ? k.slice(2) : k;
    if (onlyKeys.has(k) || onlyKeys.has(keyNoPrefix)) out[k] = v;
  }
  return out;
}

function hasBlock(css: string, selector: string): boolean {
  const re = new RegExp(`${escapeRegExp(selector)}\\s*\\{`, "m");
  return re.test(css);
}

function ensureBlock(css: string, selector: string): string {
  const injected =
`\n\n${selector} {\n  /* injected by shadcn-theme */\n}\n`;
  return css.endsWith("\n") ? css + injected : css + "\n" + injected;
}

function patchBlock(css: string, selector: string, vars: ThemeVars): { updated: string; replaced: number; appended: number } {
  const { startIdx, endIdx, body } = findBlock(css, selector);

  let replaced = 0;
  let appended = 0;

  let updatedBody = body;

  for (const [key, value] of Object.entries(vars)) {
    const varRe = new RegExp(`(^|\\n)(\\s*)${escapeRegExp(key)}\\s*:\\s*[^;]+;`, "m");
    if (varRe.test(updatedBody)) {
      updatedBody = updatedBody.replace(varRe, (m, leading, indent) => {
        replaced++;
        return `${leading}${indent}${key}: ${value};`;
      });
    } else {
      const indent = guessIndent(updatedBody) ?? "  ";
      if (!updatedBody.endsWith("\n")) updatedBody += "\n";
      updatedBody += `${indent}${key}: ${value};\n`;
      appended++;
    }
  }

  const updated = css.slice(0, startIdx) + updatedBody + css.slice(endIdx);
  return { updated, replaced, appended };
}

function getBlockBody(css: string, selector: string): string {
  return findBlock(css, selector).body;
}

function findBlock(css: string, selector: string): { startIdx: number; endIdx: number; body: string } {
  // naive but robust enough for typical globals.css
  const startRe = new RegExp(`${escapeRegExp(selector)}\\s*\\{`, "m");
  const startMatch = startRe.exec(css);
  if (!startMatch) throw new Error(`Block not found: ${selector}`);

  const openBraceIdx = (startMatch.index ?? 0) + startMatch[0].length;
  let i = openBraceIdx;
  let depth = 1;

  while (i < css.length) {
    const ch = css[i];
    if (ch === "{") depth++;
    else if (ch === "}") depth--;
    if (depth === 0) break;
    i++;
  }
  if (depth !== 0) throw new Error(`Unbalanced braces in block: ${selector}`);

  const bodyStart = openBraceIdx;
  const bodyEnd = i; // index of closing brace
  return {
    startIdx: bodyStart,
    endIdx: bodyEnd,
    body: css.slice(bodyStart, bodyEnd)
  };
}

function guessIndent(body: string): string | null {
  const m = body.match(/\n(\s*)--[a-zA-Z0-9-_]+\s*:/);
  return m?.[1] ?? null;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}