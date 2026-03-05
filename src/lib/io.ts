import fs from "node:fs/promises";
import path from "node:path";
import { createTwoFilesPatch } from "diff";

export async function readText(file: string) {
  return fs.readFile(file, "utf8");
}

export async function writeText(file: string, content: string) {
  await fs.writeFile(file, content, "utf8");
}

export async function backupFile(file: string): Promise<string> {
  const backupPath = `${file}.bak`;
  await fs.copyFile(file, backupPath);
  return backupPath;
}

export function makeDiff(file: string, before: string, after: string): string {
  return createTwoFilesPatch(file, file, before, after, "before", "after");
}

export function resolveDefaultOutFile(out: string): string {
  return path.resolve(process.cwd(), out);
}