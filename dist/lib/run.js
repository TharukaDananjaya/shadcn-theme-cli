import { spawn } from "node:child_process";
export async function runShellCommand(cmd, cwd) {
    return new Promise((resolve, reject) => {
        const child = spawn(cmd, {
            cwd,
            stdio: "inherit",
            shell: true
        });
        child.on("error", reject);
        child.on("close", (code) => resolve(code ?? 0));
    });
}
