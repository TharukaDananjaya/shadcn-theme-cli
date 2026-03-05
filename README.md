# shadcn-theme

A CLI tool to **apply and preview ShadCN UI themes** directly in your project.

Instead of manually copying theme variables, `shadcn-theme` lets you instantly apply **85+ ShadCN color presets** to your `globals.css`.

It works with any project using **ShadCN UI + Tailwind CSS**, including:

* Next.js
* Vite + React
* Laravel + Vite
* Any Tailwind project using ShadCN tokens

---

# ✨ Features

* Apply ShadCN color presets automatically
* Preview themes without committing changes
* Supports **85 theme combinations**
* Works with **Tailwind v4 OKLCH color system**
* Safe operations (`dry-run`, `diff`, preview restore)
* Auto-detects CSS files
* Works with **Next.js / Vite / Laravel**

---

# 📦 Installation

## Run with npx (recommended)

```bash
npx shadcn-theme apply zinc blue
```

## Install globally

```bash
npm install -g shadcn-theme
```

Then run:

```bash
shadcn-theme apply zinc blue
```

---

# 🚀 Usage

## List available presets

```bash
shadcn-theme list
```

Example output:

```
zinc blue
zinc rose
zinc lime
slate indigo
neutral emerald
```

---

## Apply a theme

```bash
shadcn-theme apply zinc blue
```

This updates theme variables inside your CSS:

```
:root { ... }
.dark { ... }
```

---

## Preview a theme

Preview a theme without committing changes.

```bash
shadcn-theme preview zinc rose
```

This will:

1. Temporarily update your CSS
2. Run your dev server
3. Restore CSS when you exit

Stop preview with:

```
CTRL + C
```

Your original CSS will be restored automatically.

---

## Dry run

Show changes without writing files.

```bash
shadcn-theme apply zinc blue --dry --diff
```

---

## Specify CSS file manually

If the CLI cannot detect your CSS file automatically:

```bash
shadcn-theme apply zinc blue --file app/globals.css
```

Example for Laravel:

```bash
shadcn-theme apply zinc blue --file resources/css/app.css
```

---

# 🎨 Available Themes

Themes combine **base palettes** and **accent palettes**.

### Base palettes

```
neutral
zinc
slate
stone
gray
```

### Accent palettes

```
red
rose
pink
fuchsia
purple
violet
indigo
blue
sky
cyan
teal
emerald
green
lime
yellow
amber
orange
```

Example themes:

```
zinc blue
zinc rose
neutral lime
slate indigo
stone emerald
```

Total presets:

```
5 base palettes × 17 accents = 85 themes
```

---

# ⚙️ How It Works

The CLI updates ShadCN design tokens:

```
--primary
--background
--border
--ring
--sidebar
--chart-*
```

inside:

```
:root { ... }
.dark { ... }
```

These variables power Tailwind utilities like:

```
bg-primary
text-primary
border-border
ring-ring
```

So updating tokens instantly updates your UI.

---

# 🧑‍💻 Development

Clone repository:

```bash
git clone https://github.com/YOUR_USERNAME/shadcn-theme
cd shadcn-theme
```

Install dependencies:

```bash
npm install
```

Run CLI locally:

```bash
npm run dev -- list
```

Generate presets:

```bash
node tools/generate-presets.mjs
```

Build CLI:

```bash
npm run build
```

Test globally:

```bash
npm link
shadcn-theme list
```

---

# 📂 Project Structure

```
shadcn-theme
│
├─ src
│  ├─ index.ts
│  └─ lib
│     ├─ css.ts
│     ├─ detect.ts
│     ├─ io.ts
│     ├─ presets.ts
│     └─ run.ts
│
├─ presets
│  ├─ zinc
│  ├─ slate
│  ├─ neutral
│
├─ tools
│  └─ generate-presets.mjs
│
└─ package.json
```

---

# 🤝 Contributing

Contributions are welcome.

If you find a bug or want a new feature, please open an issue.

---

# 📜 License

MIT License

---

# 🙌 Credits

Inspired by:

* ShadCN UI
* Tailwind CSS
* Theme generators like shadcnstudio
