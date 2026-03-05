import fs from "node:fs/promises";
import path from "node:path";
import { createTwoFilesPatch } from "diff";
export async function readText(file) {
    return fs.readFile(file, "utf8");
}
export async function writeText(file, content) {
    await fs.writeFile(file, content, "utf8");
}
export async function backupFile(file) {
    const backupPath = `${file}.bak`;
    await fs.copyFile(file, backupPath);
    return backupPath;
}
export function makeDiff(file, before, after) {
    return createTwoFilesPatch(file, file, before, after, "before", "after");
}
export function resolveDefaultOutFile(out) {
    return path.resolve(process.cwd(), out);
}
export async function restoreText(file, original) {
    await fs.writeFile(file, original, "utf8");
}
