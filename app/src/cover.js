// Sunset Cover Studio — the cover renderer, v2.
//
// drawCover paints one poster cover onto a canvas context: photo panels in
// the chosen layout, a sunset, neon or Vice heat colour grade, grain, a
// striped setting sun with palm silhouettes drawn in code, and the bold
// caption lettering. Everything is drawn from the state object main.js
// keeps; nothing here touches the network or the DOM.
//
// A panel slot holds one photo plus how it sits inside its panel:
//   { img, zoom, ox, oy }
// zoom 1 means cover-fit. Photos are anchored to the TOP of their panel
// while they cover it, so a portrait photo keeps the sitter's head in
// frame and the crop eats the bottom of the shot instead; below cover-fit
// (the Fit button) the photo is centred, since the whole of it shows.

export const LAYOUTS = {
  grid: { panels: 4, label: "Four panels" },
  hero: { panels: 3, label: "Hero split" },
  strip: { panels: 3, label: "Three strips" },
  single: { panels: 1, label: "One photo" },
  banner: { panels: 1, label: "Center band" },
};

export const GRADES = {
  sunset: { label: "Sunset" },
  neon: { label: "Neon night" },
  dusk: { label: "Palm dusk" },
  vice: { label: "Vice heat" },
  none: { label: "Original" },
};

export const CAPTION_COLORS = {
  white: "#fff8f0",
  pink: "#ff5da2",
  gold: "#ffc46b",
  cyan: "#7ff3ff",
};

// The caption is filled with a vertical blend, light at the top, so the
// lettering reads as lit by the sunset instead of flat paint.
export const CAPTION_GRADIENTS = {
  white: ["#fff8f0", "#ffd9a0"],
  pink: ["#ff7ac0", "#ff7a18"],
  gold: ["#ffe08a", "#ff9a3d"],
  cyan: ["#a5f6ff", "#4dd8ff"],
};

// Panel rectangles as fractions of the cover, plus where the caption lives.
// The grid and banner layouts keep the caption in their own solid band;
// the other layouts overlay the caption on a shaded band at the bottom
// (or top). The banner band runs across the bottom of one photo shown
// whole against a blurred bleed of itself, the way a poster frames a
// portrait: the face stays clear of the lettering.
export function layoutGeometry(layout, w, h) {
  const g = Math.max(4, Math.round(Math.min(w, h) * 0.007));
  const bandH = Math.round(h * 0.16);
  switch (layout) {
    case "grid": {
      const ph = (h - bandH - g * 3) / 2;
      const pw = (w - g * 3) / 2;
      return {
        panels: [
          { x: g, y: g, w: pw, h: ph },
          { x: g * 2 + pw, y: g, w: pw, h: ph },
          { x: g, y: g * 2 + ph, w: pw, h: ph },
          { x: g * 2 + pw, y: g * 2 + ph, w: pw, h: ph },
        ],
        band: { x: 0, y: h - bandH, w, h: bandH, solid: true },
        gutter: g,
      };
    }
    case "hero": {
      const rw = Math.round(w * 0.4);
      return {
        panels: [
          { x: g, y: g, w: w - rw - g * 2, h: h - g * 2 },
          { x: w - rw, y: g, w: rw - g, h: (h - g * 3) / 2 },
          { x: w - rw, y: g * 2 + (h - g * 3) / 2, w: rw - g, h: (h - g * 3) / 2 },
        ],
        band: { x: 0, y: Math.round(h * 0.74), w, h: Math.round(h * 0.26), solid: false },
        gutter: g,
      };
    }
    case "strip": {
      const pw = (w - g * 4) / 3;
      return {
        panels: [0, 1, 2].map((i) => ({
          x: g + i * (pw + g),
          y: g,
          w: pw,
          h: h - g * 2,
        })),
        band: { x: 0, y: Math.round(h * 0.74), w, h: Math.round(h * 0.26), solid: false },
        gutter: g,
      };
    }
    case "banner": {
      // Center-band poster: one photo, shown whole against a blurred
      // bleed of itself, with the caption band across the bottom. The
      // band sits low on purpose: a portrait photo's face fills the
      // upper frame, and a band across the middle would cross it.
      const bh = Math.round(h * 0.24);
      return {
        panels: [{ x: g, y: g, w: w - g * 2, h: h - g * 2 }],
        band: { x: 0, y: h - bh, w, h: bh, solid: true },
        blurFill: true,
        gutter: g,
      };
    }
    default: // single
      return {
        panels: [{ x: g, y: g, w: w - g * 2, h: h - g * 2 }],
        band: { x: 0, y: Math.round(h * 0.74), w, h: Math.round(h * 0.26), solid: false },
        gutter: g,
      };
  }
}

// Which panel, if any, holds the point (x, y) in cover pixels.
export function panelAt(layout, x, y, w, h) {
  const { panels } = layoutGeometry(layout, w, h);
  for (let i = 0; i < panels.length; i += 1) {
    const p = panels[i];
    if (x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + p.h) return i;
  }
  return -1;
}

// A tiny deterministic random source, so the grain looks the same on every
// export of the same cover.
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function drawPhoto(ctx, slot, panel, fitMode) {
  const { img, zoom, ox, oy } = slot;
  ctx.save();
  ctx.beginPath();
  ctx.rect(panel.x, panel.y, panel.w, panel.h);
  ctx.clip();
  if (!img) {
    const grad = ctx.createLinearGradient(panel.x, panel.y, panel.x + panel.w, panel.y + panel.h);
    grad.addColorStop(0, "#3d1a63");
    grad.addColorStop(1, "#c96f2e");
    ctx.fillStyle = grad;
    ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = `700 ${Math.round(panel.h * 0.055)}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("YOUR PHOTO HERE", panel.x + panel.w / 2, panel.y + panel.h / 2);
    ctx.restore();
    return;
  }
  // fitMode shows the whole photo (zoom 1 means fit); otherwise the photo
  // covers the panel (zoom 1 means cover-fit).
  const base = fitMode
    ? Math.min(panel.w / img.naturalWidth, panel.h / img.naturalHeight)
    : Math.max(panel.w / img.naturalWidth, panel.h / img.naturalHeight);
  // zoom below 1 shows the whole photo (the Fit button uses it), so the
  // photo is centred; at cover-fit and above, the photo is anchored to
  // the panel's top, keeping heads in frame while the bottom is cropped.
  // main.js keeps zoom inside 0.5 to 3.
  const scale = base * zoom;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const dx = panel.x + (panel.w - dw) / 2 + ox * panel.w;
  const dy = fitMode || zoom < 1
    ? panel.y + (panel.h - dh) / 2 + oy * panel.h
    : panel.y + oy * panel.h;
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

function applyGrade(ctx, grade, w, h) {
  if (grade === "sunset") {
    const wash = ctx.createLinearGradient(0, 0, 0, h);
    wash.addColorStop(0, "rgba(255,122,24,0.06)");
    wash.addColorStop(0.55, "rgba(255,80,60,0.12)");
    wash.addColorStop(1, "rgba(255,45,120,0.34)");
    ctx.globalCompositeOperation = "overlay";
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "source-over";
  } else if (grade === "neon") {
    const wash = ctx.createLinearGradient(0, 0, w, 0);
    wash.addColorStop(0, "rgba(255,45,120,0.28)");
    wash.addColorStop(0.5, "rgba(120,60,220,0.12)");
    wash.addColorStop(1, "rgba(0,229,255,0.28)");
    ctx.globalCompositeOperation = "overlay";
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "source-over";
  } else if (grade === "dusk") {
    const wash = ctx.createLinearGradient(0, 0, 0, h);
    wash.addColorStop(0, "rgba(43,16,85,0.32)");
    wash.addColorStop(1, "rgba(255,122,24,0.18)");
    ctx.globalCompositeOperation = "soft-light";
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "source-over";
  } else if (grade === "vice") {
    // Vice heat: a hot magenta-to-orange duotone with a low sun glow.
    const wash = ctx.createLinearGradient(0, 0, 0, h);
    wash.addColorStop(0, "rgba(255,45,120,0.30)");
    wash.addColorStop(0.5, "rgba(255,122,24,0.14)");
    wash.addColorStop(1, "rgba(120,20,180,0.32)");
    ctx.globalCompositeOperation = "overlay";
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "source-over";
    const glow = ctx.createRadialGradient(
      w / 2, h * 0.16, 0,
      w / 2, h * 0.16, Math.max(w, h) * 0.5,
    );
    glow.addColorStop(0, "rgba(255,190,80,0.24)");
    glow.addColorStop(1, "rgba(255,190,80,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
  }
  // Vignette: darken the edges so the caption band and the panels sit in
  // one poster, whatever the grade.
  const vig = ctx.createRadialGradient(
    w / 2, h / 2, Math.min(w, h) * 0.42,
    w / 2, h / 2, Math.max(w, h) * 0.75,
  );
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(8,2,18,0.38)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
}

function applyGrain(ctx, w, h) {
  const rand = mulberry32(20261120);
  const dots = Math.round((w * h) / 1400);
  ctx.save();
  for (let i = 0; i < dots; i += 1) {
    const x = rand() * w;
    const y = rand() * h;
    ctx.fillStyle = rand() > 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)";
    ctx.fillRect(x, y, 1.4, 1.4);
  }
  ctx.restore();
}

// One palm silhouette, drawn in code: a leaning trunk, six drooping
// fronds and two coconuts. (x, y) is the base of the trunk, s its height.
function drawPalm(ctx, x, y, s, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = "round";
  const topX = x + s * 0.16;
  const topY = y - s * 0.95;
  ctx.lineWidth = Math.max(2, s * 0.03);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + s * 0.08, y - s * 0.55, topX, topY);
  ctx.stroke();
  for (let i = 0; i < 6; i += 1) {
    const a = Math.PI * (0.06 + i * 0.17);
    const ex = topX + Math.cos(a) * s * 0.44;
    const ey = topY + Math.sin(a) * s * 0.30 + s * 0.12;
    ctx.lineWidth = Math.max(1.5, s * 0.012);
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(
      topX + Math.cos(a) * s * 0.24,
      topY + Math.sin(a) * s * 0.08 - s * 0.10,
      ex, ey,
    );
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(topX - s * 0.02, topY + s * 0.02, s * 0.02, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(topX + s * 0.03, topY + s * 0.03, s * 0.018, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// The solid caption band's own art: a striped setting sun on the right
// and a palm silhouette on the left, both drawn in code. The sun's slats
// are painted with the band's own gradient, so the disc reads as cut
// out of the band. The caption is drawn over the top afterwards, so the
// art never fights the lettering.
function drawBandArt(ctx, w, bandY, bandH) {
  const pad = Math.round(w * 0.045);
  const r = Math.round(bandH * 0.34);
  const cx = w - pad - r;
  const cy = bandY + bandH / 2;
  const sun = ctx.createLinearGradient(cx, cy - r, cx, cy + r);
  sun.addColorStop(0, "#ffd23e");
  sun.addColorStop(0.55, "#ff7a18");
  sun.addColorStop(1, "#ff2d78");
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = sun;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  const slat = ctx.createLinearGradient(0, bandY, 0, bandY + bandH);
  slat.addColorStop(0, "#2b1055");
  slat.addColorStop(1, "#160a26");
  ctx.fillStyle = slat;
  let y = cy + r * 0.1;
  let gap = Math.max(2, r * 0.06);
  while (y < cy + r) {
    ctx.fillRect(cx - r, y, r * 2, gap);
    y += gap * 2.2;
    gap *= 1.25;
  }
  ctx.restore();
  drawPalm(ctx, pad + r * 0.3, bandY + bandH - Math.round(bandH * 0.06), bandH * 0.72, "rgba(22,10,38,0.85)");
}

function drawCaption(ctx, state, w, h, band) {
  const caption = (state.caption || "").trim().toUpperCase();
  const tagline = (state.tagline || "").trim();
  const onTop = state.captionPos === "top";
  const bandY = onTop ? 0 : band.y;
  const bandH = band.h;

  if (band.solid) {
    const bg = ctx.createLinearGradient(0, bandY, 0, bandY + bandH);
    bg.addColorStop(0, "#2b1055");
    bg.addColorStop(1, "#160a26");
    ctx.fillStyle = bg;
    ctx.fillRect(0, bandY, w, bandH);
    ctx.fillStyle = "#ff2d78";
    ctx.fillRect(0, bandY, w, Math.max(4, Math.round(h * 0.005)));
    drawBandArt(ctx, w, bandY, bandH);
  } else {
    const shade = ctx.createLinearGradient(0, bandY, 0, bandY + bandH);
    if (onTop) {
      shade.addColorStop(0, "rgba(10,4,20,0.88)");
      shade.addColorStop(1, "rgba(10,4,20,0)");
    } else {
      shade.addColorStop(0, "rgba(10,4,20,0)");
      shade.addColorStop(1, "rgba(10,4,20,0.88)");
    }
    ctx.fillStyle = shade;
    ctx.fillRect(0, bandY, w, bandH);
  }

  if (!caption) return;
  const pad = Math.round(w * 0.045);
  const maxWidth = w - pad * 2;
  let size = Math.round(h * 0.115 * (state.captionScale || 1));
  const fontFor = (s) => `${s}px Anton, "Arial Black", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = fontFor(size);
  const measured = ctx.measureText(caption).width;
  if (measured > maxWidth) size = Math.max(18, Math.floor((size * maxWidth) / measured));
  ctx.font = fontFor(size);

  const centerY = onTop
    ? bandY + bandH * 0.42
    : bandY + bandH * (band.solid ? 0.44 : 0.58);
  ctx.save();
  ctx.translate(w / 2, centerY);
  ctx.rotate(-0.015);
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = size / 8;
  ctx.shadowOffsetY = size / 18;
  ctx.lineJoin = "round";
  ctx.lineWidth = Math.max(3, size / 11);
  ctx.strokeStyle = "rgba(16,4,30,0.92)";
  ctx.strokeText(caption, 0, 0);
  // The fill is a sunset blend, light at the top of each letter.
  const [top, bottom] = CAPTION_GRADIENTS[state.color] || CAPTION_GRADIENTS.white;
  const fill = ctx.createLinearGradient(0, -size / 2, 0, size / 2);
  fill.addColorStop(0, top);
  fill.addColorStop(1, bottom);
  ctx.fillStyle = fill;
  ctx.fillText(caption, 0, 0);
  ctx.restore();

  if (tagline) {
    const tagSize = Math.max(14, Math.round(size * 0.26));
    ctx.font = `600 ${tagSize}px system-ui, sans-serif`;
    try {
      ctx.letterSpacing = `${Math.round(tagSize * 0.18)}px`;
    } catch {
      // Older engines ignore letter spacing; the tagline still draws.
    }
    ctx.fillStyle = "rgba(255,240,248,0.92)";
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = tagSize / 4;
    ctx.shadowOffsetY = 1;
    const tagY = onTop
      ? bandY + bandH * 0.42 + size * 0.72
      : bandY + bandH * (band.solid ? 0.44 : 0.58) + size * 0.72;
    ctx.fillText(tagline.toUpperCase(), w / 2, tagY);
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    try {
      ctx.letterSpacing = "0px";
    } catch {
      // No-op on engines without letter spacing.
    }
  }
}

export function drawCover(ctx, state, w, h) {
  const layout = state.layout || "grid";
  const geo = layoutGeometry(layout, w, h);
  ctx.fillStyle = "#12081f";
  ctx.fillRect(0, 0, w, h);
  const count = LAYOUTS[layout].panels;
  for (let i = 0; i < count; i += 1) {
    // A blurFill layout shows the photo whole; the panel behind it is
    // filled with a blurred, darkened bleed of the same photo, so the
    // cover reads as one poster instead of a photo with empty margins.
    if (geo.blurFill && state.panels[i].img) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(geo.panels[i].x, geo.panels[i].y, geo.panels[i].w, geo.panels[i].h);
      ctx.clip();
      ctx.filter = "blur(28px) brightness(0.5) saturate(1.2)";
      ctx.drawImage(state.panels[i].img, geo.panels[i].x, geo.panels[i].y, geo.panels[i].w, geo.panels[i].h);
      ctx.restore();
      ctx.filter = "none";
    }
    drawPhoto(ctx, state.panels[i], geo.panels[i], geo.blurFill);
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = Math.max(2, Math.round(Math.min(w, h) * 0.002));
    ctx.strokeRect(geo.panels[i].x, geo.panels[i].y, geo.panels[i].w, geo.panels[i].h);
  }
  applyGrade(ctx, state.grade || "sunset", w, h);
  applyGrain(ctx, w, h);
  const band = state.captionPos === "top"
    ? { ...geo.band, y: 0 }
    : geo.band;
  drawCaption(ctx, state, w, h, band);
  return geo;
}
