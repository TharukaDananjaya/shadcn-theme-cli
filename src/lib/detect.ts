import fg from "fast-glob";

export async function detectCssFile(): Promise<string | null> {
  const candidates = [
    "app/globals.css",          // Next.js app router
    "styles/globals.css",
    "src/globals.css",
    "src/index.css",
    "resources/css/app.css"     // Laravel + Vite common
  ];

  for (const c of candidates) {
    const match = await fg(c, { onlyFiles: true, dot: true });
    if (match.length) return match[0];
  }

  // fallback scan
  const any = await fg(["**/globals.css", "**/app.css", "**/index.css"], {
    onlyFiles: true,
    dot: true,
    ignore: ["**/node_modules/**", "**/.next/**", "**/dist/**", "**/build/**"]
  });

  return any[0] ?? null;
}