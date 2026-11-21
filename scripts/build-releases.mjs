// Builds Kirkstagram release artifacts.
// Usage: node scripts/build-releases.mjs
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(new URL(import.meta.url))));
const out = join(root, "releases");
const stage = join(root, ".release-staging");

rmSync(stage, { recursive: true, force: true });
mkdirSync(stage, { recursive: true });

function stageDir(name) {
	const dir = join(stage, name);
	mkdirSync(dir, { recursive: true });
	return dir;
}

function copyFile(src, destDir) {
	mkdirSync(destDir, { recursive: true });
	copyFileSync(src, join(destDir, basename(src)));
}

function copyCore(destDir) {
	const srcDir = join(root, "packages/core/src");
	for (const entry of readdirSync(srcDir, { withFileTypes: true })) {
		const src = join(srcDir, entry.name);
		const dest = join(destDir, entry.name);
		if (entry.isDirectory()) {
			mkdirSync(dest, { recursive: true });
			for (const child of readdirSync(src)) copyFileSync(join(src, child), join(dest, child));
		} else {
			copyFile(src, destDir);
		}
	}
}

function zip(srcRoot, entries, zipPath) {
	mkdirSync(dirname(zipPath), { recursive: true });
	execFileSync("tar.exe", ["-a", "-cf", zipPath, "-C", srcRoot, ...entries], { stdio: "inherit" });
}

// --- Vencord: extracts into <VENCORD> root ---
// Archive contents: src/plugins/kirkstagram/index.ts + src/packages/core/src/*
const vencord = stageDir("vencord");
copyFile(join(root, "platforms/vencord/index.ts"), join(vencord, "src/plugins/kirkstagram"));
copyCore(join(vencord, "src/packages/core/src"));
zip(vencord, ["src"], join(out, "vencord/Kirkstagram.zip"));

// --- Revenge: extracts into <@rrevenge-plugin-template> root ---
// Archive contents: plugins/kirkstagram/{index.js, js/index.js, manifest.json} + packages/core/src/*
const revenge = stageDir("revenge");
copyFile(join(root, "platforms/revenge/index.js"), join(revenge, "plugins/kirkstagram"));
copyFile(join(root, "platforms/revenge/manifest.json"), join(revenge, "plugins/kirkstagram"));
copyCore(join(revenge, "packages/core/src"));
const jsDir = join(revenge, "plugins/kirkstagram/js");
mkdirSync(jsDir, { recursive: true });
const jsContent = readFileSync(join(root, "platforms/revenge/index.js"), "utf8").replaceAll(
	"../../packages/core/src/index",
	"../../../packages/core/src/index",
);
writeFileSync(join(jsDir, "index.js"), jsContent);
zip(revenge, ["plugins", "packages"], join(out, "revenge/com.kirkstagram.revenge@1.0.0.zip"));

// --- Valenced: extracts into <@valenced-plugin-template> root ---
// Archive contents: manifest.json + the bundled plugin script index.js.
// The script is built with the Valenced plugin toolchain
// (`valenced-plugin build` equivalent; see `.research/valenced-plugin-template/bundle.mjs`):
// external @valenced/* imports become `valenced.*` globals and the shared
// core engine is inlined, so the artifact is self-contained.
const valenced = stageDir("valenced");
copyFile(join(root, "platforms/valenced/manifest.json"), valenced);
copyFile(
	join(root, ".research", "valenced-plugin-template", "plugins", "kirkstagram", "build", "js", "index.js"),
	valenced,
);
zip(valenced, ["manifest.json", "index.js"], join(out, "valenced/com.kirkstagram.valenced@1.0.0.zip"));

console.log("Release artifacts built under releases/:");
for (const f of [
	"releases/vencord/Kirkstagram.zip",
	"releases/revenge/com.kirkstagram.revenge@1.0.0.zip",
	"releases/valenced/com.kirkstagram.valenced@1.0.0.zip",
]) {
	console.log(" ", f);
}
