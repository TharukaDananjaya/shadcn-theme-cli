# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.2] - 2026-03-06

### Fixed
- Preview command now correctly restores CSS on Ctrl+C when installed via npx
- Use synchronous file writes in SIGINT/SIGTERM handlers to prevent abandoned async operations

---

## [1.0.0] - 2026-03-06

Initial public release.

### Commands

- **`list`** — List all 85 available `<base> <accent>` preset combinations
- **`apply`** — Apply a preset's CSS variables to your `globals.css` (or any CSS file)
- **`preview`** — Temporarily apply a preset, run your dev server, and automatically restore the original CSS on exit (`Ctrl+C`)
- **`export`** — Export the current theme tokens from your CSS file into a reusable JSON preset file
- **`doctor`** — Diagnose common setup issues that prevent theme changes from appearing in the browser

### Presets

- 85 built-in ShadCN color presets: **5 base palettes** (`neutral`, `zinc`, `slate`, `stone`, `gray`) × **17 accent palettes** (`red`, `rose`, `pink`, `fuchsia`, `purple`, `violet`, `indigo`, `blue`, `sky`, `cyan`, `teal`, `emerald`, `green`, `lime`, `yellow`, `amber`, `orange`)
- Supports two preset JSON formats: native format (`light`/`dark`) and ShadCN registry format (`cssVars.light`/`cssVars.dark`)

### Features

- **Partial apply** — update only specific CSS variables using `--only <keys>` or `--group <name>`
- **Variable groups** — `brand`, `surfaces`, `sidebar`, `charts`, `radius`
- **Dry run** — preview what would be written without touching the file (`--dry`)
- **Diff output** — show a unified diff of all changes (`--diff`)
- **Auto-backup** — creates a `.bak` copy before any write, with opt-out via `--no-backup`
- **Auto CSS detection** — resolves `globals.css` automatically for Next.js App Router, Pages Router, Vite, and Laravel projects
- **Custom selectors** — override the default `:root` and `.dark` selectors via `--selector` and `--dark-selector`
- **Tailwind v4 OKLCH** color system support

### Doctor checks

- CSS file detection and readability
- `:root` and `.dark` block existence
- Required CSS variable definitions (`--primary`, `--background`, `--ring`, `--border`) scoped to `:root` only
- Tailwind v4 `@theme inline` mapping validation
- Framework CSS import verification (Next.js App Router, Pages Router, Vite/React, Laravel Blade)
- Build cache detection (`.next`, `node_modules/.vite`, `dist`, etc.)
- Tailwind v3 dark mode `class` strategy config check
- Tailwind v4 `@custom-variant dark` check

### Bug fixes

- Doctor no longer reports a false positive for `--primary` when the variable is only defined in `.dark { }` or referenced in `@theme inline` — it now checks for definitions inside `:root` only
- `apply` and `preview` now show a clear error message when a preset is not found instead of crashing with a raw Node.js `ENOENT`
- `apply` and `preview` now show a clear error message when the specified CSS file does not exist
- `--group <unknown>` now prints a friendly error message instead of an unhandled rejection

### Package

- Added `files` field to `package.json` — only `dist/`, `presets/`, `README.md`, and `LICENSE` are included in the published package
- Moved `picocolors` from `devDependencies` to `dependencies` (it is used at runtime)
- CLI `--version` flag now correctly reports `1.0.0`
- Added `LICENSE` (MIT)
- Added `.gitignore`
