// Sunset Cover Studio — the entrypoint for gta6-cover-art-01.
//
// This program hands the app in. It is plain Node 22 with the standard
// library only, and it runs the same way in the grader's container and on a
// developer's machine: it copies app/ and screenshots/ from beside this file
// into the output directory and writes dossier.json there, the summary the
// judge reads, built by the vendored make.fun library.
//
// The app itself is static files under app/ — index.html and its modules,
// the Anton lettering font, and two sample photos — that a desktop browser
// loads with no network request. Try it with `node serve.ts`, then open
// http://localhost:8080.
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Run it twice into two directories and the bytes must come out identical.

import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-app.ts";

// The repository root is the directory this file lives in.
const repoRoot = fileURLToPath(new URL(".", import.meta.url));
// The grader writes to /output; a local run names its own directory.
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";

mkdirSync(outputDir, { recursive: true });

// The whole app, exactly as it stands in the repository.
cpSync(join(repoRoot, "app"), join(outputDir, "app"), { recursive: true });

// The screenshots, when the folder exists; the dossier lists whatever is there.
mkdirSync(join(outputDir, "screenshots"), { recursive: true });
const shotsDir = join(repoRoot, "screenshots");
if (existsSync(shotsDir)) {
  cpSync(shotsDir, join(outputDir, "screenshots"), { recursive: true });
}

// The caps are the scorer's own (reference/gate.json). text_max_bytes is the
// only one that shapes the dossier's bytes; the rest refuse an entry the
// scorer would refuse anyway — more than 4 screenshots or one over 256 KiB,
// more than 993 files in app/ or 48 MiB of app files in all, or a path under
// app/ longer than 1000 bytes — so the build fails loudly here instead of
// handing in an entry that cannot pass.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});

writeFileSync(join(outputDir, "dossier.json"), dossier);
