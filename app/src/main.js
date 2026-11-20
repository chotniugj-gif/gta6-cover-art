// Sunset Cover Studio — page wiring.
//
// Keeps the cover state, binds every control, and paints the live preview.
// Photos are read on this machine with FileReader and object URLs; nothing
// is uploaded anywhere. Exports draw the same cover offscreen at the exact
// post size and download it as a PNG.
//
// A `?shot=` query sets up a fixed scene for a screenshot instead:
//   ?shot=editor — the editor with a sample photo loaded
//   ?shot=cover  — the cover alone, filling the viewport
// `photo` picks the sample (samples/<photo>.jpg), `caption` and `tagline`
// the words, `layout`, `grade`, `size` and `color` the rest of the scene.
// window.__shotReady is set once the scene has painted.

import { drawCover, layoutGeometry, panelAt, LAYOUTS } from "./cover.js";

const canvas = document.getElementById("stage");
const statusEl = document.getElementById("status");
const trayEl = document.getElementById("tray");
const panelHint = document.getElementById("panelHint");
const zoomInput = document.getElementById("zoomInput");

const SIZES = {
  "1080x1080": { w: 1080, h: 1080 },
  "1080x1350": { w: 1080, h: 1350 },
  "1920x1080": { w: 1920, h: 1080 },
};

const state = {
  layout: "grid",
  grade: "sunset",
  caption: "Sunset Heist",
  tagline: "A story in three panels",
  color: "white",
  captionPos: "bottom",
  captionScale: 1,
  size: { ...SIZES["1080x1080"] },
  panels: [0, 1, 2, 3].map(() => ({ img: null, zoom: 1, ox: 0, oy: 0 })),
};

const tray = []; // { img, url, name }
let selectedTray = -1;
let selectedPanel = -1;
let fontsReady = false;

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

async function ensureFonts() {
  if (fontsReady) return;
  try {
    await document.fonts.load('100px Anton');
    await document.fonts.ready;
  } catch {
    // The caption falls back to a heavy system font; the cover still draws.
  }
  fontsReady = true;
}

async function render() {
  await ensureFonts();
  canvas.width = state.size.w;
  canvas.height = state.size.h;
  const ctx = canvas.getContext("2d");
  drawCover(ctx, state, state.size.w, state.size.h);
}

function setStatus(text) {
  statusEl.textContent = text;
}

function refreshTray() {
  trayEl.innerHTML = "";
  if (tray.length === 0) {
    const empty = document.createElement("span");
    empty.className = "empty";
    empty.textContent = "No photos yet — choose some, or load a sample.";
    trayEl.appendChild(empty);
    return;
  }
  tray.forEach((photo, i) => {
    const thumb = document.createElement("img");
    thumb.src = photo.url;
    thumb.alt = photo.name;
    thumb.title = photo.name;
    if (i === selectedTray) thumb.classList.add("selected");
    thumb.addEventListener("click", () => {
      selectedTray = i;
      refreshTray();
      setStatus(`${photo.name} selected — click a panel to place it.`);
    });
    trayEl.appendChild(thumb);
  });
}

function refreshPanelHint() {
  if (selectedPanel < 0) {
    panelHint.textContent = "Click a panel on the cover to select it.";
    return;
  }
  const slot = state.panels[selectedPanel];
  panelHint.textContent = slot.img
    ? `Panel ${selectedPanel + 1} selected — drag to move, scroll to zoom.`
    : `Panel ${selectedPanel + 1} selected — empty. Pick a photo from the tray and click this panel.`;
  zoomInput.value = String(Math.round(slot.zoom * 100));
}

function placePhoto(panelIndex, trayIndex) {
  if (panelIndex < 0 || trayIndex < 0) return;
  const slot = state.panels[panelIndex];
  slot.img = tray[trayIndex].img;
  slot.zoom = 1;
  slot.ox = 0;
  slot.oy = 0;
  selectedPanel = panelIndex;
  refreshPanelHint();
  render();
}

async function addFiles(files) {
  const added = [];
  for (const file of files) {
    if (!file.type.startsWith("image/")) continue;
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImage(url);
      tray.push({ img, url, name: file.name });
      added.push(img);
    } catch {
      URL.revokeObjectURL(url);
    }
  }
  if (added.length === 0) {
    setStatus("No images in that selection.");
    return;
  }
  selectedTray = tray.length - 1;
  // A fresh photo fills every empty panel, so the cover is complete at once.
  const first = tray[selectedTray].img;
  state.panels.forEach((slot) => {
    if (!slot.img) {
      slot.img = first;
      slot.zoom = 1;
      slot.ox = 0;
      slot.oy = 0;
    }
  });
  refreshTray();
  setStatus(`${added.length} photo${added.length > 1 ? "s" : ""} loaded.`);
  render();
}

async function loadSample(name) {
  const img = await loadImage(`./samples/${name}.jpg`);
  const url = `./samples/${name}.jpg`;
  const existing = tray.findIndex((p) => p.url === url);
  if (existing === -1) {
    tray.push({ img, url, name: `${name}.jpg (sample)` });
    selectedTray = tray.length - 1;
  } else {
    selectedTray = existing;
  }
  state.panels.forEach((slot) => {
    slot.img = img;
    slot.zoom = 1;
    slot.ox = 0;
    slot.oy = 0;
  });
  refreshTray();
  render();
}

// Loads one sample photo per panel, cycling through the names given, so a
// screenshot scene can show a poster collage instead of one photo repeated.
async function loadPanelPhotos(names) {
  const loaded = [];
  for (const name of names) {
    const url = `./samples/${name}.jpg`;
    let entry = tray.find((p) => p.url === url);
    if (!entry) {
      const img = await loadImage(url);
      entry = { img, url, name: `${name}.jpg (sample)` };
      tray.push(entry);
    }
    loaded.push(entry.img);
  }
  state.panels.forEach((slot, i) => {
    slot.img = loaded[i % loaded.length];
    slot.zoom = 1;
    slot.ox = 0;
    slot.oy = 0;
  });
  selectedTray = tray.length - 1;
  refreshTray();
  render();
}

// --- Controls -------------------------------------------------------------

document.getElementById("photoInput").addEventListener("change", (e) => {
  addFiles([...e.target.files]);
  e.target.value = "";
});

document.getElementById("sampleBtn").addEventListener("click", async () => {
  setStatus("Loading sample photo…");
  try {
    await loadSample("pier");
    setStatus("Sample photo loaded into every panel.");
  } catch {
    setStatus("The sample photo did not load.");
  }
});

document.getElementById("fillAllBtn").addEventListener("click", () => {
  if (selectedTray < 0) {
    setStatus("Pick a photo from the tray first.");
    return;
  }
  const img = tray[selectedTray].img;
  state.panels.forEach((slot) => {
    slot.img = img;
    slot.zoom = 1;
    slot.ox = 0;
    slot.oy = 0;
  });
  setStatus("That photo now fills every panel.");
  render();
});

document.getElementById("clearBtn").addEventListener("click", () => {
  state.panels.forEach((slot) => {
    slot.img = null;
    slot.zoom = 1;
    slot.ox = 0;
    slot.oy = 0;
  });
  selectedPanel = -1;
  refreshPanelHint();
  setStatus("Panels cleared.");
  render();
});

function bindChoiceGroup(id, attr, apply) {
  const group = document.getElementById(id);
  group.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn || !btn.dataset[attr]) return;
    group.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    apply(btn.dataset[attr]);
    render();
  });
}

bindChoiceGroup("layoutBtns", "layout", (v) => {
  state.layout = v;
  selectedPanel = -1;
  refreshPanelHint();
});
bindChoiceGroup("gradeBtns", "grade", (v) => { state.grade = v; });
bindChoiceGroup("sizeBtns", "size", (v) => {
  state.size = { ...SIZES[v] };
  setStatus(`Export size ${v.replace("x", " × ")}.`);
});

document.getElementById("captionInput").addEventListener("input", (e) => {
  state.caption = e.target.value;
  render();
});
document.getElementById("taglineInput").addEventListener("input", (e) => {
  state.tagline = e.target.value;
  render();
});
document.getElementById("colorSelect").addEventListener("change", (e) => {
  state.color = e.target.value;
  render();
});
document.getElementById("posSelect").addEventListener("change", (e) => {
  state.captionPos = e.target.value;
  render();
});
document.getElementById("captionSize").addEventListener("input", (e) => {
  state.captionScale = Number(e.target.value) / 100;
  render();
});

zoomInput.addEventListener("input", () => {
  if (selectedPanel < 0) return;
  state.panels[selectedPanel].zoom = Number(zoomInput.value) / 100;
  render();
});

document.getElementById("fitBtn").addEventListener("click", () => {
  if (selectedPanel < 0) {
    setStatus("Select a panel first.");
    return;
  }
  const slot = state.panels[selectedPanel];
  if (!slot.img) return;
  const geo = layoutGeometry(state.layout, state.size.w, state.size.h);
  const p = geo.panels[selectedPanel];
  const base = Math.max(p.w / slot.img.naturalWidth, p.h / slot.img.naturalHeight);
  const fit = Math.min(p.w / slot.img.naturalWidth, p.h / slot.img.naturalHeight);
  slot.zoom = fit / base;
  slot.ox = 0;
  slot.oy = 0;
  refreshPanelHint();
  render();
});

document.getElementById("fillBtn").addEventListener("click", () => {
  if (selectedPanel < 0) {
    setStatus("Select a panel first.");
    return;
  }
  const slot = state.panels[selectedPanel];
  slot.zoom = 1;
  slot.ox = 0;
  slot.oy = 0;
  refreshPanelHint();
  render();
});

// --- Canvas interaction: click to select / place, drag to pan, scroll to zoom

function canvasPoint(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) / rect.width) * canvas.width,
    y: ((e.clientY - rect.top) / rect.height) * canvas.height,
  };
}

let drag = null;

canvas.addEventListener("pointerdown", (e) => {
  const pt = canvasPoint(e);
  const hit = panelAt(state.layout, pt.x, pt.y, state.size.w, state.size.h);
  if (hit < 0) return;
  selectedPanel = hit;
  refreshPanelHint();
  drag = { panel: hit, startX: pt.x, startY: pt.y, ox: state.panels[hit].ox, oy: state.panels[hit].oy, moved: 0 };
  canvas.setPointerCapture(e.pointerId);
  render();
});

canvas.addEventListener("pointermove", (e) => {
  if (!drag) return;
  const pt = canvasPoint(e);
  const geo = layoutGeometry(state.layout, state.size.w, state.size.h);
  const p = geo.panels[drag.panel];
  const dx = pt.x - drag.startX;
  const dy = pt.y - drag.startY;
  drag.moved = Math.max(drag.moved, Math.abs(dx) + Math.abs(dy));
  const slot = state.panels[drag.panel];
  slot.ox = Math.max(-0.5, Math.min(0.5, drag.ox + dx / p.w));
  slot.oy = Math.max(-0.5, Math.min(0.5, drag.oy + dy / p.h));
  render();
});

canvas.addEventListener("pointerup", () => {
  if (drag && drag.moved < 4 && selectedTray >= 0) {
    placePhoto(drag.panel, selectedTray);
  }
  drag = null;
});

canvas.addEventListener("wheel", (e) => {
  e.preventDefault();
  const pt = canvasPoint(e);
  const hit = panelAt(state.layout, pt.x, pt.y, state.size.w, state.size.h);
  if (hit < 0) return;
  selectedPanel = hit;
  const slot = state.panels[hit];
  slot.zoom = Math.max(0.5, Math.min(3, slot.zoom * (e.deltaY < 0 ? 1.1 : 0.9)));
  refreshPanelHint();
  render();
}, { passive: false });

// --- Export ---------------------------------------------------------------

async function exportPng() {
  await ensureFonts();
  const off = document.createElement("canvas");
  off.width = state.size.w;
  off.height = state.size.h;
  const ctx = off.getContext("2d");
  drawCover(ctx, state, state.size.w, state.size.h);
  const name = `sunset-cover-${state.size.w}x${state.size.h}.png`;
  const blob = await new Promise((resolve) => off.toBlob(resolve, "image/png"));
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  window.__exported = { name, w: state.size.w, h: state.size.h };
  setStatus(`Saved ${name} — ${state.size.w} × ${state.size.h}.`);
  return name;
}

document.getElementById("exportBtn").addEventListener("click", exportPng);
window.__exportPng = exportPng;

// --- Screenshot scenes ----------------------------------------------------

async function runShot() {
  const query = new URLSearchParams(location.search);
  const shot = query.get("shot");
  if (!shot) return false;
  if (shot === "cover") document.body.classList.add("shot-cover");
  const layout = query.get("layout");
  if (layout && LAYOUTS[layout]) state.layout = layout;
  const grade = query.get("grade");
  if (grade) state.grade = grade;
  const size = query.get("size");
  if (size && SIZES[size]) state.size = { ...SIZES[size] };
  const color = query.get("color");
  if (color) state.color = color;
  const pos = query.get("pos");
  if (pos) state.captionPos = pos;
  const caption = query.get("caption");
  if (caption !== null) {
    state.caption = caption;
    document.getElementById("captionInput").value = caption;
  }
  const tagline = query.get("tagline");
  if (tagline !== null) {
    state.tagline = tagline;
    document.getElementById("taglineInput").value = tagline;
  }
  const photos = query.get("photos");
  try {
    if (photos) {
      await loadPanelPhotos(photos.split(",").map((s) => s.trim()).filter(Boolean));
    } else {
      await loadSample(query.get("photo") ?? "pier");
    }
  } catch {
    setStatus("The sample photo did not load.");
  }
  // ?vary=1 frames each panel differently — a closer crop here, a shift
  // there — so a one-photo cover reads as a poster, not a tiled repeat.
  if (query.get("vary")) {
    const zooms = [1, 1.5, 1.3, 1.8];
    const shifts = [[0, 0], [0.1, -0.06], [-0.12, 0.05], [0.06, 0.08]];
    state.panels.forEach((slot, i) => {
      slot.zoom = zooms[i % zooms.length];
      slot.ox = shifts[i % shifts.length][0];
      slot.oy = shifts[i % shifts.length][1];
    });
  }
  // Sync the choice buttons with the scene, so the editor shot shows them.
  document.querySelectorAll("#layoutBtns .choice").forEach((b) => {
    b.classList.toggle("active", b.dataset.layout === state.layout);
  });
  document.querySelectorAll("#gradeBtns .choice").forEach((b) => {
    b.classList.toggle("active", b.dataset.grade === state.grade);
  });
  document.querySelectorAll("#sizeBtns .choice").forEach((b) => {
    b.classList.toggle("active", b.dataset.size === `${state.size.w}x${state.size.h}`);
  });
  await render();
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
  return true;
}

refreshTray();
refreshPanelHint();
if (!(await runShot())) {
  await render();
}
