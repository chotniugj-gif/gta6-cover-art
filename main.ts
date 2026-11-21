// Sunset Cover Studio — the hand-in program for gta6-cover-art-01.
//
// This is a plain Node 22 program using only the standard library. It
// runs the same way inside the grader's container and on a developer's
// own machine: it copies the app and the screenshots from next to this
// file into the output directory, then writes dossier.json there, the
// summary the judge reads, using the vendored make.fun library.
//
// The app itself is static files under app/ — index.html and its modules,
// the Anton lettering font, and two sample photos — that a desktop
// browser loads with no network request at all. Try it with
// `node serve.ts`, then open http://localhost:8080.
//
// When the grader runs it, the output directory is /output. Anywhere
// else, MAKEFUN_OUTPUT_DIR names the directory instead:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Run it twice into two directories and the bytes must come out identical.

import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-app.ts";

// This file's directory is the repository root.
const root = fileURLToPath(new URL(".", import.meta.url));
// The grader writes to /output; a local run names its own directory.
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";

mkdirSync(outDir, { recursive: true });

// The app, exactly as it stands in the repository.
cpSync(join(root, "app"), join(outDir, "app"), { recursive: true });

// The screenshots, when the folder is there; the dossier lists whatever
// it finds in the output.
mkdirSync(join(outDir, "screenshots"), { recursive: true });
const shots = join(root, "screenshots");
if (existsSync(shots)) {
  cpSync(shots, join(outDir, "screenshots"), { recursive: true });
}

// The caps are the scorer's own (reference/gate.json). text_max_bytes is
// the only one that shapes the dossier's bytes; the rest refuse an entry
// the scorer would refuse anyway — more than 4 screenshots or one over
// 256 KiB, more than 993 files in app/ or 48 MiB of app files in all,
// or a path under app/ longer than 1000 bytes — so the build fails
// loudly here instead of handing in an entry that cannot pass.
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});

writeFileSync(join(outDir, "dossier.json"), dossier);
