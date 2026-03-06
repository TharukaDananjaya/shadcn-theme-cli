# shadcn-theme-cli

[![npm version](https://img.shields.io/npm/v/shadcn-theme-cli)](https://www.npmjs.com/package/shadcn-theme-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Node.js >= 18](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)

A CLI tool to **apply, preview, export, and diagnose ShadCN UI themes** directly in your project.

Instead of manually copying theme variables, `shadcn-theme` lets you instantly apply **85 ShadCN color presets** to your `globals.css` — with safe backup, diff preview, partial apply, and automatic CSS restore.

Works with any project using **ShadCN UI + Tailwind CSS**, including:

- Next.js (App Router & Pages Router)
- Vite + React
- Laravel + Vite
- Any Tailwind CSS project using ShadCN tokens

---

## ✨ Features

- **Apply** 85 ShadCN color presets instantly (`apply`)
- **Preview** themes live with automatic CSS restore on exit (`preview`)
- **Export** your current theme tokens to a reusable JSON file (`export`)
- **Diagnose** setup issues that prevent theme changes from showing (`doctor`)
- **Partial apply** — update only specific variables or a named group (`--only`, `--group`)
- **Dry run + diff** — see what would change before writing (`--dry`, `--diff`)
- **Auto-backup** — creates a `.bak` file before any write (opt-out with `--no-backup`)
- **Auto-detects** your CSS file (Next.js, Vite, Laravel)
- **Tailwind v4 OKLCH** color system support
- **Two preset JSON formats** — native format and ShadCN registry format

---

## 📋 Requirements

- **Node.js** 18 or later
- A project using **ShadCN UI** with `globals.css` (or equivalent) containing `:root` and `.dark` variable blocks

---

## 📦 Installation

### Run without installing (recommended)

```bash
npx shadcn-theme-cli apply zinc blue
```

### Install globally

```bash
npm install -g shadcn-theme-cli
```

Then use the `shadcn-theme` command:

```bash
shadcn-theme apply zinc blue
```

---

## 🚀 Commands

### `list` — List available presets

```bash
shadcn-theme list
```

Lists all available `<base> <accent>` combinations:

```
gray amber
gray blue
neutral blue
neutral rose
slate indigo
stone emerald
zinc blue
zinc rose
...
```

---

### `apply` — Apply a preset to your CSS

```bash
shadcn-theme apply <base> <accent> [options]
```

**Examples:**

```bash
# Basic apply
shadcn-theme apply zinc blue

# Apply to a specific file
shadcn-theme apply slate rose --file app/globals.css

# Dry run — show what would change without writing
shadcn-theme apply zinc blue --dry --diff

# Apply only brand-related variables
shadcn-theme apply zinc blue --group brand

# Apply only specific variables
shadcn-theme apply zinc blue --only primary,ring,border

# Apply without creating a backup
shadcn-theme apply zinc blue --no-backup

# Laravel
shadcn-theme apply zinc blue --file resources/css/app.css
```

**All options:**

| Option | Default | Description |
|---|---|---|
| `-f, --file <path>` | auto-detect | Path to your CSS file |
| `--selector <selector>` | `:root` | CSS selector for the light theme block |
| `--dark-selector <selector>` | `.dark` | CSS selector for the dark theme block |
| `--only <keys>` | — | Apply only these CSS variables (comma-separated, e.g. `primary,ring`) |
| `--group <name>` | — | Apply a predefined variable group: `brand`, `surfaces`, `sidebar`, `charts`, `radius` |
| `--create-missing` / `--no-create-missing` | enabled | Create the selector block if it is missing |
| `--dry` | — | Print output but do not write the file |
| `--diff` | — | Show a unified diff of the changes |
| `--backup` / `--no-backup` | enabled | Create a `.bak` file before writing |

---

### `preview` — Live preview with automatic restore

> [!NOTE]
> Before run 'preview' you must terminate/stop the other process

Temporarily applies a preset, starts your dev server, and **restores the original CSS** when you exit.

```bash
shadcn-theme preview <base> <accent> [options]
```

**Examples:**

```bash
# Preview using the default dev server (npm run dev)
shadcn-theme preview zinc rose

# Preview with a custom dev command
shadcn-theme preview neutral indigo --cmd "pnpm dev"

# Preview on a specific CSS file
shadcn-theme preview slate blue --file src/index.css --cmd "yarn dev"
```

**All options:**

| Option | Default | Description |
|---|---|---|
| `-f, --file <path>` | auto-detect | Path to your CSS file |
| `--selector <selector>` | `:root` | CSS selector for the light theme block |
| `--dark-selector <selector>` | `.dark` | CSS selector for the dark theme block |
| `--only <keys>` | — | Apply only specific CSS variables during preview |
| `--group <name>` | — | Apply a named variable group during preview |
| `--create-missing` / `--no-create-missing` | enabled | Create blocks if missing |
| `--cmd <command>` | `npm run dev` | Dev server command to run during preview |

Stop the preview with `Ctrl+C` — your original CSS is restored automatically.

---

### `export` — Export current theme to JSON

Reads your CSS file and exports the current light and dark variable values to a JSON preset file.

```bash
shadcn-theme export [options]
```

**Examples:**

```bash
# Export to the default output file
shadcn-theme export

# Export from a specific CSS file
shadcn-theme export --file app/globals.css

# Export to a custom output path
shadcn-theme export --out my-brand-theme.json
```

**All options:**

| Option | Default | Description |
|---|---|---|
| `-f, --file <path>` | auto-detect | Path to your CSS file |
| `--selector <selector>` | `:root` | CSS selector for the light block to read |
| `--dark-selector <selector>` | `.dark` | CSS selector for the dark block to read |
| `-o, --out <path>` | `shadcn-theme.export.json` | Output JSON file path |

The exported JSON uses the native preset format and can be used as a custom preset.

---

### `doctor` — Diagnose theme setup issues

Checks your project for common reasons why applied themes might not appear in the browser.

```bash
shadcn-theme doctor
```

```bash
# Diagnose a specific CSS file
shadcn-theme doctor --file app/globals.css
```

The doctor checks:

1. **CSS file** — can be found and read
2. **Token blocks** — `:root` and `.dark` blocks exist
3. **Required variables** — `--primary`, `--background`, `--ring`, `--border` are present
4. **Tailwind v4 mapping** — `@theme inline` block exists for utility resolution
5. **Framework import** — CSS is correctly imported in your entry file (Next.js App Router, Pages Router, Vite, Laravel Blade)
6. **Cache folders** — `.next`, `node_modules/.vite`, `dist`, etc. detected (reminder to restart dev server)

Output example:

```
shadcn-theme doctor

✔ Detected CSS file: app/globals.css
✔ Found required variables: --primary, --background, --ring, --border
✔ Found '@theme inline' mapping.
✔ Next.js App Router import OK (app/layout.tsx).
⚠ Cache folders detected: .next. If changes don't show: restart dev server or run a clean.
```

---

## 🎨 Available Themes

Themes are a combination of a **base palette** and an **accent palette**.

### Base palettes

| Name | Description |
|---|---|
| `neutral` | Neutral grays |
| `zinc` | Cool zinc grays |
| `slate` | Slate-tinted grays |
| `stone` | Warm stone grays |
| `gray` | Standard grays |

### Accent palettes

```
red  rose  pink  fuchsia  purple  violet  indigo
blue  sky  cyan  teal  emerald  green  lime  yellow  amber  orange
```

**Total: 5 base × 17 accents = 85 presets**

---

## 🧩 Variable Groups

When using `--group`, only variables in that group are updated. Useful when you want to change just your brand colors without touching layout surfaces.

| Group | Variables |
|---|---|
| `brand` | `primary`, `primary-foreground`, `ring`, `accent`, `accent-foreground`, `secondary`, `secondary-foreground` |
| `surfaces` | `background`, `foreground`, `card`, `card-foreground`, `popover`, `popover-foreground`, `muted`, `muted-foreground`, `border`, `input` |
| `sidebar` | `sidebar`, `sidebar-foreground`, `sidebar-primary`, `sidebar-primary-foreground`, `sidebar-accent`, `sidebar-accent-foreground`, `sidebar-border`, `sidebar-ring` |
| `charts` | `chart-1`, `chart-2`, `chart-3`, `chart-4`, `chart-5` |
| `radius` | `radius` |

**Examples:**

```bash
# Update only primary brand colors
shadcn-theme apply zinc blue --group brand

# Update only surface/background colors
shadcn-theme apply zinc blue --group surfaces

# Update only chart colors
shadcn-theme apply stone amber --group charts
```

---

## ⚙️ How It Works

### 1. Preset lookup

Each theme is stored as a JSON file at `presets/<base>/<accent>.json` inside the package. The CLI resolves the file based on the `<base>` and `<accent>` arguments you provide.

Two JSON formats are supported:

**Native format:**
```json
{
  "name": "zinc-blue",
  "light": {
    "--primary": "oklch(0.546 0.245 262.881)",
    "--background": "oklch(1 0 0)",
    "--radius": "0.625rem"
  },
  "dark": {
    "--primary": "oklch(0.707 0.165 254.624)",
    "--background": "oklch(0.145 0 0)"
  }
}
```

**ShadCN registry format** (also accepted):
```json
{
  "name": "zinc-blue",
  "cssVars": {
    "light": { "primary": "oklch(0.546 0.245 262.881)" },
    "dark":  { "primary": "oklch(0.707 0.165 254.624)" }
  }
}
```

### 2. CSS patching

The CLI reads your `globals.css`, locates the `:root` and `.dark` blocks (or the selectors you specify), and replaces or appends each CSS variable. Variables already present are replaced in-place; new variables are appended inside the block. Missing blocks are created if `--create-missing` is enabled (the default).

### 3. Safety mechanisms

- **Backup**: a `.bak` copy of your CSS is made before any write (unless `--no-backup`).
- **Dry run**: pass `--dry` to print what would be written without touching the file.
- **Diff**: pass `--diff` to see a unified diff of the changes.
- **Preview restore**: the `preview` command saves your original CSS in memory and restores it on `Ctrl+C`, `SIGTERM`, or any uncaught error.

### 4. Validation

Before applying, the preset variables are validated:
- Keys must start with `--`
- Values must be valid CSS color or size tokens (`oklch(...)`, `hsl(...)`, `rgb(...)`, hex, `rem`/`px` values)

Warnings are shown for suspicious values but do not block the apply.

### 5. Partial apply

You can scope which variables get updated:
- `--only primary,ring` — update only the listed variables
- `--group brand` — update all variables in the `brand` group

This lets you mix palettes (e.g. apply one preset's brand colors on top of another preset's surfaces).

---

## 🛠 Custom Presets

You can use the `export` command to create a JSON preset from your current CSS, edit it, and reuse it:

```bash
# Export your current theme
shadcn-theme export --out my-theme.json

# Apply your custom preset (not yet supported as a direct path argument)
# For now, place your file in the presets/ directory and use the base/accent name
```

> **Note:** Direct file-path presets (`apply --preset ./my-theme.json`) are planned for a future release. Currently, custom presets must follow the `presets/<base>/<accent>.json` directory structure.

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes
4. Open a pull request

For bug reports and feature requests, [open an issue](https://github.com/TharukaDananjaya/shadcn-theme-cli/issues).

---

## 📜 License

[MIT](./LICENSE) — Tharuka Dananjaya

---

## 🙌 Credits

Inspired by:

- [ShadCN UI](https://ui.shadcn.com)
- [Tailwind CSS](https://tailwindcss.com)
- The ShadCN theme palette at [ui.shadcn.com/colors](https://ui.shadcn.com/colors)
