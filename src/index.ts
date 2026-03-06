#!/usr/bin/env node
import pc from "picocolors";
import fs from "node:fs";
import { Command } from "commander";
import { detectCssFile } from "./lib/detect.js";
import { listPresets, loadPreset } from "./lib/presets.js";
import { applyThemeToCss, extractVarsFromCss } from "./lib/css.js";
import { validateVars } from "./lib/validate.js";
import { backupFile, checkFileExists, makeDiff, readText, writeText } from "./lib/io.js";
import { parseOnlyKeys } from "./lib/groups.js";
import { runShellCommand } from "./lib/run.js";
import { runDoctor } from "./lib/doctor.js";

const program = new Command();

program.name("shadcn-theme").description("Apply ShadCN theme presets to CSS variables (:root and .dark)").version("1.0.0");

program
	.command("list")
	.description("List available presets (base/accent)")
	.action(async () => {
		const presets = await listPresets();
		if (!presets.length) {
			console.log(pc.yellow("No presets found. Add JSON files under ./presets/<base>/<accent>.json"));
			return;
		}
		for (const p of presets) console.log(`${p.base} ${p.accent}`);
	});

program
	.command("apply")
	.description("Apply a preset to your CSS file")
	.argument("<base>", "Base palette (e.g. zinc, slate)")
	.argument("<accent>", "Accent (e.g. blue, rose)")
	.option("-f, --file <path>", "CSS file path (auto-detect if omitted)")
	.option("--selector <selector>", "Light selector block", ":root")
	.option("--dark-selector <selector>", "Dark selector block", ".dark")
	.option("--create-missing", "Create missing blocks (recommended)", true)
	.option("--no-create-missing", "Do not create missing blocks")
	.option("--only <keys>", "Apply only these keys (comma-separated), e.g. primary,ring,border")
	.option("--group <name>", "Apply a group: brand|surfaces|sidebar|charts|radius")
	.option("--dry", "Dry run (no write)")
	.option("--diff", "Print diff")
	.option("--backup", "Create .bak before writing", true)
	.option("--no-backup", "Do not create backup")
	.action(async (base, accent, opts) => {
		let preset;
		try {
			preset = await loadPreset(base, accent);
		} catch (error) {
			console.error(pc.red(`Failed to load preset "${base} ${accent}".`));
			const message = error instanceof Error ? error.message : String(error);
			console.error(pc.gray(`Reason: ${message}`));
			console.error(pc.gray(`Run ${pc.white("shadcn-theme list")} to see available presets.`));
			process.exit(1);
		}

		// Flow 8 validation
		const issues = [...validateVars(preset.light), ...validateVars(preset.dark)];
		if (issues.length) {
			console.log(pc.yellow("Preset validation warnings:"));
			for (const i of issues.slice(0, 10)) {
				console.log(`- ${i.key}: ${i.value} (${i.reason})`);
			}
			if (issues.length > 10) console.log(`...and ${issues.length - 10} more`);
		}

		const file = opts.file ?? (await detectCssFile());
		if (!file) {
			console.error(pc.red("Could not auto-detect CSS file. Use --file path/to/globals.css"));
			process.exit(1);
		}

		let before: string;
		try {
			before = await readText(file);
		} catch (err: any) {
			const msg = err instanceof Error ? err.message : String(err);
			console.error(pc.red(`Could not read CSS file "${file}": ${msg}`));
			process.exit(1);
		}

		// Flow 6: partial apply
		let onlyKeys: Set<string> | undefined;
		try {
			onlyKeys = parseOnlyKeys(opts.only, opts.group);
		} catch (e: any) {
			console.error(pc.red(e.message));
			process.exit(1);
		}

		const { updatedCss: after, stats } = applyThemeToCss(before, preset.light, preset.dark, {
			selectorLight: opts.selector,
			selectorDark: opts.darkSelector,
			createMissing: Boolean(opts.createMissing),
			onlyKeys,
		});

		if (opts.diff) {
			console.log(makeDiff(file, before, after));
		}

		console.log(pc.green(`Target: ${file}`));
		if (stats.createdLightBlock) console.log(pc.yellow(`Created missing block: ${opts.selector}`));
		if (stats.createdDarkBlock) console.log(pc.yellow(`Created missing block: ${opts.darkSelector}`));
		console.log(`Light: replaced ${stats.lightReplaced}, appended ${stats.lightAppended} | ` + `Dark: replaced ${stats.darkReplaced}, appended ${stats.darkAppended}`);

		if (opts.dry) {
			console.log(pc.yellow("Dry run: no changes written."));
			return;
		}

		if (opts.backup) {
			if (await checkFileExists(`${file}.bak`)) {
				console.error(pc.yellow(`Backup file already exists. Skipping backup to avoid overwrite: ${file}.bak`));
			} else {
				const bak = await backupFile(file);
				console.log(pc.gray(`Backup created: ${bak}`));
			}
		}

		await writeText(file, after);
		console.log(pc.green(`Applied preset ${base}/${accent}`));
	});

program
	.command("preview")
	.description("Temporarily apply a preset, run dev server, and restore CSS on exit")
	.argument("<base>", "Base palette (e.g. neutral, zinc, slate)")
	.argument("<accent>", "Accent (e.g. lime, rose, indigo)")
	.option("-f, --file <path>", "CSS file path (auto-detect if omitted)")
	.option("--selector <selector>", "Light selector block", ":root")
	.option("--dark-selector <selector>", "Dark selector block", ".dark")
	.option("--create-missing", "Create missing blocks", true)
	.option("--no-create-missing", "Do not create missing blocks")
	.option("--only <keys>", "Apply only these keys (comma-separated)")
	.option("--group <name>", "Apply a group: brand|surfaces|sidebar|charts|radius")
	.option("--cmd <command>", "Dev command to run", "npm run dev")
	.action(async (base, accent, opts) => {
		let preset;
		try {
			preset = await loadPreset(base, accent);
		} catch (err) {
			console.error(pc.red(`Preset not found: "${base} ${accent}"`));
			if (err instanceof Error && err.message) {
				console.error(pc.red(`Details: ${err.message}`));
			}
			console.error(pc.gray(`Run ${pc.white("shadcn-theme list")} to see available presets.`));
			process.exit(1);
		}

		const file = opts.file ?? (await detectCssFile());
		if (!file) {
			console.error(pc.red("Could not auto-detect CSS file. Use --file path/to/globals.css"));
			process.exit(1);
		}

		let before: string;
		try {
			before = await readText(file);
		} catch (e) {
			console.error(pc.red(`Could not read CSS file: ${file}`));
			console.error(e);
			process.exit(1);
		}

		// Write a physical backup to disk before patching.
		// This is the source of truth for restore — more reliable than memory,
		// especially across async signal boundaries in signal handlers.
		const previewBackup = `${file}.preview-backup`;
		fs.writeFileSync(previewBackup, before, "utf8");

		// apply theme same as apply command
		let onlyKeys: Set<string> | undefined;
		try {
			onlyKeys = parseOnlyKeys(opts.only, opts.group);
		} catch (e: any) {
			console.error(pc.red(e.message));
			fs.rmSync(previewBackup, { force: true });
			process.exit(1);
		}

		const { updatedCss: after, stats } = applyThemeToCss(before, preset.light, preset.dark, {
			selectorLight: opts.selector,
			selectorDark: opts.darkSelector,
			createMissing: Boolean(opts.createMissing),
			onlyKeys,
		});

		// Write preview CSS
		await writeText(file, after);

		console.log(pc.green(`Preview theme active: ${base}/${accent}`));
		console.log(pc.gray(`File patched: ${file}`));
		if (stats.createdLightBlock) console.log(pc.yellow(`Created missing block: ${opts.selector}`));
		if (stats.createdDarkBlock) console.log(pc.yellow(`Created missing block: ${opts.darkSelector}`));
		console.log(pc.cyan(`Running: ${opts.cmd}`));
		console.log(pc.yellow("Stop preview with Ctrl+C — CSS will be restored."));

		let restored = false;

		// Synchronous restore — MUST be sync because async ops in signal handlers
		// (SIGINT/SIGTERM) are not guaranteed to complete before the process exits.
		// This is the root cause of the "CSS restored" message showing but file
		// being wiped when running via npx on the published package.
		const restoreSync = () => {
			if (restored) return;
			restored = true;
			try {
				const original = fs.readFileSync(previewBackup, "utf8");
				fs.writeFileSync(file, original, "utf8");
				try { fs.unlinkSync(previewBackup); } catch {}
				console.log(pc.green("\nCSS restored."));
			} catch (e) {
				console.error(pc.red(`\nFailed to restore CSS. Your backup is at: ${previewBackup}`));
				console.error(e);
			}
		};

		// Async restore used after the dev server exits normally (not from a signal).
		// We wait 1500ms here to let the dev server finish any file cleanup before restoring.
		// NOTE: `restored` is intentionally NOT set before the delay so that a SIGINT/SIGTERM
		// arriving during the wait can still trigger restoreSync() and recover the CSS.
		const restoreAsync = async () => {
			if (restored) return;
			await new Promise((r) => setTimeout(r, 1500));
			// Re-check after the delay: a signal may have triggered restoreSync() already.
			restoreSync();
		};

		process.on("SIGINT", () => {
			restoreSync();
			process.exit(0);
		});
		process.on("SIGTERM", () => {
			restoreSync();
			process.exit(0);
		});
		process.on("uncaughtException", (err) => {
			console.error(pc.red("Uncaught exception:"), err);
			restoreSync();
			process.exit(1);
		});
		process.on("unhandledRejection", (err) => {
			console.error(pc.red("Unhandled rejection:"), err);
			restoreSync();
			process.exit(1);
		});

		// Run dev server (blocks until it exits)
		const exitCode = await runShellCommand(String(opts.cmd), process.cwd());

		// Normal exit path (dev server stopped by itself, not Ctrl+C)
		await restoreAsync();

		process.exit(exitCode);
	});

program
	.command("export")
	.description("Export current theme tokens from CSS into a JSON preset")
	.option("-f, --file <path>", "CSS file path (auto-detect if omitted)")
	.option("--selector <selector>", "Light selector block", ":root")
	.option("--dark-selector <selector>", "Dark selector block", ".dark")
	.option("-o, --out <path>", "Output JSON file", "shadcn-theme.export.json")
	.action(async (opts) => {
		const file = opts.file ?? (await detectCssFile());
		if (!file) {
			console.error(pc.red("Could not auto-detect CSS file. Use --file path/to/globals.css"));
			process.exit(1);
		}

		const css = await readText(file);
		const light = extractVarsFromCss(css, opts.selector);
		const dark = extractVarsFromCss(css, opts.darkSelector);

		const out = {
			name: "exported",
			light,
			dark,
		};

		await writeText(opts.out, JSON.stringify(out, null, 2));
		console.log(pc.green(`Exported theme -> ${opts.out}`));
	});
program
	.command("doctor")
	.description("Diagnose why theme changes may not reflect in the running app")
	.option("-f, --file <path>", "CSS file path (auto-detect if omitted)")
	.action(async (opts) => {
		const file = opts.file ?? (await detectCssFile());
		const result = await runDoctor(file);

		console.log("");
		console.log(pc.bold("shadcn-theme doctor"));
		console.log("");

		for (const m of result.messages) console.log(pc.green("✔ ") + m);
		for (const w of result.warnings) console.log(pc.yellow("⚠ ") + w);
		for (const e of result.errors) console.log(pc.red("✖ ") + e);

		console.log("");

		if (!result.ok) {
			console.log(pc.red("Doctor found issues. Fix them and try again."));
			process.exitCode = 1;
		} else {
			console.log(pc.green("Doctor checks passed."));
		}
	});

program.parseAsync(process.argv);
