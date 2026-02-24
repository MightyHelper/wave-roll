import * as PIXI from "pixi.js";
import { PianoRoll } from "../piano-roll";
import type { PianoRollAugments } from "../types-internal";
import { NoteData } from "@/lib/midi/types";
import type { OnsetMarkerShape, OnsetMarkerStyle } from "@/types";
import { COLOR_EVAL_HIGHLIGHT } from "@/lib/core/constants";
import { toNumberColor } from "@/components/player/wave-roll/evaluation/colors";
import { NoteSprite as NoteSpriteClass } from "./note-sprite";

// Cache for hatch textures keyed by orientation to avoid recreating
let WR_HATCH_TEXTURE_CACHE: Partial<Record<"up" | "down", PIXI.Texture>> = {};
// Subtle per-file pattern textures to improve CVD distinguishability
let WR_PATTERN_TEXTURE_CACHE: Partial<Record<"up" | "down" | "cross" | "dots", PIXI.Texture>> = {};
// Onset shape textures cached by shape+variant+stroke+color to avoid recreating
let WR_ONSET_TEXTURE_CACHE: Record<string, PIXI.Texture> = {};

// NOTE: `NoteSprite` is now a class implemented in `note-sprite.ts`.
// The interface alias previously exported from this file was removed.

// Renderer-local augmentation for optional caches/flags on PianoRoll.
// This keeps the external/public API clean without using `any`.
type AugmentedPianoRoll = PianoRoll & PianoRollAugments;


function getPatternTexture(
  kind: "up" | "down" | "cross" | "dots"
): PIXI.Texture {
  const cached = WR_PATTERN_TEXTURE_CACHE[kind];
  if (cached) return cached;

  const size = 10;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, size, size);
  ctx.strokeStyle = "#000000"; // black lines to contrast on tinted notes
  ctx.fillStyle = "#000000";
  ctx.lineWidth = 1.5;
  ctx.lineCap = "butt";

  if (kind === "up") {
    ctx.beginPath();
    ctx.moveTo(-2, size);
    ctx.lineTo(size, -2);
    ctx.moveTo(0, size + 2);
    ctx.lineTo(size + 2, 0);
    ctx.stroke();
  } else if (kind === "down") {
    ctx.beginPath();
    ctx.moveTo(-2, -2);
    ctx.lineTo(size, size);
    ctx.moveTo(0, 0);
    ctx.lineTo(size + 2, size + 2);
    ctx.stroke();
  } else if (kind === "cross") {
    ctx.beginPath();
    // vertical
    ctx.moveTo(size / 2, 0);
    ctx.lineTo(size / 2, size);
    // horizontal
    ctx.moveTo(0, size / 2);
    ctx.lineTo(size, size / 2);
    ctx.stroke();
  } else if (kind === "dots") {
    for (let y = 2; y < size; y += 4) {
      for (let x = 2; x < size; x += 4) {
        ctx.beginPath();
        ctx.arc(x, y, 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  const tex = PIXI.Texture.from(canvas);
  const src = tex.source as unknown as { style?: { addressMode?: string } };
  if (src.style) src.style.addressMode = "repeat";
  WR_PATTERN_TEXTURE_CACHE[kind] = tex;
  return tex;
}


function getOnsetTextureByStyle(
  style: OnsetMarkerStyle,
  colorHex: string
): PIXI.Texture {
  const key = `${style.shape}-${style.variant}-${style.strokeWidth}-${colorHex}`;
  const cached = WR_ONSET_TEXTURE_CACHE[key];
  if (cached) return cached;


  // internal canvas size; sprite scaled per-row later
  const s = 16;
  const cx = s / 2;
  const cy = s / 2;
  const r = s * 0.35;
  const canvas = document.createElement("canvas");
  canvas.width = s;
  canvas.height = s;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, s, s);
  ctx.lineWidth = Math.max(1, style.strokeWidth);
  ctx.strokeStyle = colorHex;
  ctx.fillStyle = style.variant === "filled" ? "#ffffff" : "transparent";
  ctx.lineJoin = "miter";

  const drawPolygon = (points: Array<[number, number]>) => {
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
    ctx.closePath();
    if (style.variant === "filled") ctx.fill();
    ctx.stroke();
  };

  const drawShape = (shape: OnsetMarkerShape) => {
    switch (shape) {
      case "circle": {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        if (style.variant === "filled") ctx.fill();
        ctx.stroke();
        return;
      }
      case "square": {
        const d = r * Math.SQRT1_2;
        drawPolygon([
          [cx - d, cy - d],
          [cx + d, cy - d],
          [cx + d, cy + d],
          [cx - d, cy + d],
        ]);
        return;
      }
      case "diamond": {
        drawPolygon([
          [cx, cy - r],
          [cx + r, cy],
          [cx, cy + r],
          [cx - r, cy],
        ]);
        return;
      }
      case "triangle-up": {
        drawPolygon([
          [cx, cy - r],
          [cx + r * 0.866, cy + r * 0.5],
          [cx - r * 0.866, cy + r * 0.5],
        ]);
        return;
      }
      case "triangle-down": {
        drawPolygon([
          [cx - r * 0.866, cy - r * 0.5],
          [cx + r * 0.866, cy - r * 0.5],
          [cx, cy + r],
        ]);
        return;
      }
      case "triangle-left": {
        drawPolygon([
          [cx + r, cy - r * 0.866 * 0.5],
          [cx + r, cy + r * 0.866 * 0.5],
          [cx - r, cy],
        ]);
        return;
      }
      case "triangle-right": {
        drawPolygon([
          [cx - r, cy - r * 0.866 * 0.5],
          [cx - r, cy + r * 0.866 * 0.5],
          [cx + r, cy],
        ]);
        return;
      }
      case "star": {
        const points: Array<[number, number]> = [];
        const spikes = 5;
        const outer = r;
        const inner = r * 0.45;
        for (let i = 0; i < spikes * 2; i++) {
          const angle = (i * Math.PI) / spikes - Math.PI / 2;
          const rad = i % 2 === 0 ? outer : inner;
          points.push([cx + Math.cos(angle) * rad, cy + Math.sin(angle) * rad]);
        }
        drawPolygon(points);
        return;
      }
      case "cross": {
        // X-shape
        ctx.beginPath();
        ctx.moveTo(cx - r, cy - r);
        ctx.lineTo(cx + r, cy + r);
        ctx.moveTo(cx + r, cy - r);
        ctx.lineTo(cx - r, cy + r);
        ctx.stroke();
        return;
      }
      case "plus": {
        ctx.beginPath();
        ctx.moveTo(cx - r, cy);
        ctx.lineTo(cx + r, cy);
        ctx.moveTo(cx, cy - r);
        ctx.lineTo(cx, cy + r);
        ctx.stroke();
        return;
      }
      case "hexagon": {
        const pts: Array<[number, number]> = [];
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI / 3) * i + Math.PI / 6;
          pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
        }
        drawPolygon(pts);
        return;
      }
      case "pentagon": {
        const pts: Array<[number, number]> = [];
        for (let i = 0; i < 5; i++) {
          const a = (2 * Math.PI / 5) * i - Math.PI / 2;
          pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
        }
        drawPolygon(pts);
        return;
      }
      case "chevron-up": {
        drawPolygon([
          [cx - r, cy + r * 0.4],
          [cx, cy - r * 0.6],
          [cx + r, cy + r * 0.4],
        ]);
        return;
      }
      case "chevron-down": {
        drawPolygon([
          [cx - r, cy - r * 0.4],
          [cx, cy + r * 0.6],
          [cx + r, cy - r * 0.4],
        ]);
        return;
      }
      default: {
        // Fallback to square
        const d = r * Math.SQRT1_2;
        drawPolygon([
          [cx - d, cy - d],
          [cx + d, cy - d],
          [cx + d, cy + d],
          [cx - d, cy + d],
        ]);
      }
    }
  };

  drawShape(style.shape);
  const tex = PIXI.Texture.from(canvas);
  WR_ONSET_TEXTURE_CACHE[key] = tex;
  return tex;
}

function getHatchTexture(direction: "up" | "down" = "up"): PIXI.Texture {
  const cached = WR_HATCH_TEXTURE_CACHE[direction];
  if (cached) {
    return cached;
  }

  // Larger tile and thicker line to improve visibility
  const size = 12;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, size, size);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.lineCap = "butt";
  ctx.beginPath();

  if (direction === "up") {
    // 45° (bottom-left ➜ top-right)
    ctx.moveTo(-2, size - 2);
    ctx.lineTo(size - 2, -2);
    ctx.moveTo(0, size);
    ctx.lineTo(size, 0);
    ctx.moveTo(2, size + 2);
    ctx.lineTo(size + 2, 2);
  } else {
    // -45° (top-left ➜ bottom-right)
    ctx.moveTo(-2, -2);
    ctx.lineTo(size - 2, size - 2);
    ctx.moveTo(0, 0);
    ctx.lineTo(size, size);
    ctx.moveTo(2, 2);
    ctx.lineTo(size + 2, size + 2);
  }

  ctx.stroke();
  const tex = PIXI.Texture.from(canvas);
  // Pixi v8: enable texture tiling when style is available
  const src = tex.source as unknown as { style?: { addressMode?: string } };
  if (src.style) src.style.addressMode = "repeat";
  WR_HATCH_TEXTURE_CACHE[direction] = tex;
  return tex;
}

function handleSprites(pianoRoll: PianoRoll, baseTexture: PIXI.Texture<PIXI.BufferImageSource>) {
  // console.debug(`Have ${pianoRoll.noteSprites.length} sprites, need ${pianoRoll.notes.length}`)
  // Prepare diagonal-hatch textures for overlay with emphasized visibility
  while (pianoRoll.noteSprites.length < pianoRoll.notes.length) {
    // Use the extracted NoteSprite class which sets up pointer handlers
    const sprite = new NoteSpriteClass(baseTexture, pianoRoll);
    pianoRoll.notesContainer.addChild(sprite);
    pianoRoll.noteSprites.push(sprite);
    // Ensure hatch overlay pool matches sprite pool
    // Pattern overlay (always-on subtle file pattern) --------------------
    const pr = pianoRoll as AugmentedPianoRoll;
    const patternSprites = pr.patternSprites ??= [];
    const pattern = new PIXI.TilingSprite({ texture: getPatternTexture("up"), width: 1, height: 1 });
    pattern.visible = true; // force hidden globally per user preference
    pattern.alpha = 0.18; // subtle
    pattern.tint = 0x000000; // neutral (black) pattern
    pattern.blendMode = "normal";
    pianoRoll.notesContainer.addChild(pattern);
    patternSprites.push(pattern);

    // Onset marker sprite pool (one per note)
    const onsetSprites = pr.onsetSprites ??= [];
    const onset = new PIXI.Sprite(PIXI.Texture.WHITE);
    onset.visible = false;
    onset.alpha = 0.75; // semi-transparent to let overlaps visually mix
    onset.blendMode = "normal"; // use normal blending to avoid washout on white bg
    pianoRoll.notesContainer.addChild(onset);
    onsetSprites.push(onset);

    // Evaluation hatch overlay (on-demand) -------------------------------
    const hatchSprites = pr.hatchSprites ??= [];
    // Pixi v8: TilingSprite accepts an options object
    const overlay = new PIXI.TilingSprite({ texture: getHatchTexture("up"), width: 1, height: 1 });
    overlay.visible = false;
    overlay.alpha = 0.55;
    overlay.tint = toNumberColor(COLOR_EVAL_HIGHLIGHT);
    pianoRoll.notesContainer.addChild(overlay);
    hatchSprites.push(overlay);
  }
   while (pianoRoll.noteSprites.length > pianoRoll.notes.length) {
     const s = pianoRoll.noteSprites.pop();
     if (s) {
       pianoRoll.notesContainer.removeChild(s);
       s.destroy();
     }
     const pr2 = pianoRoll as AugmentedPianoRoll;
     const hatchSprites = pr2.hatchSprites as PIXI.TilingSprite[] | undefined;
     const patternSprites = pr2.patternSprites as PIXI.TilingSprite[] | undefined;
     if (patternSprites && patternSprites.length > pianoRoll.noteSprites.length) {
       const p = patternSprites.pop();
       if (p) {
         pianoRoll.notesContainer.removeChild(p);
         p.destroy();
       }
     }
     if (hatchSprites && hatchSprites.length > pianoRoll.noteSprites.length) {
       const o = hatchSprites.pop();
       if (o) {
         pianoRoll.notesContainer.removeChild(o);
         o.destroy();
       }
     }
     const onsetSprites = pr2.onsetSprites as PIXI.Sprite[] | undefined;
     if (onsetSprites && onsetSprites.length > pianoRoll.noteSprites.length) {
       const m = onsetSprites.pop();
       if (m) {
         pianoRoll.notesContainer.removeChild(m);
         m.destroy();
       }
     }
     // onsetOutlineSprites are no longer used
   }
}

function renderPianoNote(pianoRoll: PianoRoll, idx: number, note: NoteData, pianoKeysOffset: number, zoomY: number, baseRowHeight: number) {
  const sprite = pianoRoll.noteSprites[idx] as NoteSpriteClass;
  // Compute geometry once; container pan is applied globally elsewhere.
  const x = pianoRoll.timeScale(note.time) * pianoRoll.state.zoomX + pianoKeysOffset;
  const yBase = pianoRoll.pitchScale(note.midi);
  const canvasMid = pianoRoll.options.height / 2;
  const y = (yBase - canvasMid) * zoomY + canvasMid;
  const width = pianoRoll.timeScale(note.duration) * pianoRoll.state.zoomX;
  const height = Math.max(1, baseRowHeight * 0.8 * zoomY);

  // Use the NoteSprite helper to assign geometry
  sprite.updateGeometry(x, y - height / 2, width, height);

  // Color and alpha ---------------------------------
  const noteColor = pianoRoll.options.noteRenderer
    ? pianoRoll.options.noteRenderer(note, idx)
    : pianoRoll.options.noteColor;

  // Store current note data on the sprite for tooltip access
  sprite.noteData = note;

  // Apply transparency only for GRAY notes to avoid overly dark appearance
  // The neutral gray used across evaluation/highlight modes is 0x444444.
  const NEUTRAL_GRAY_NOTE = 0x444444;
  const alpha = noteColor === NEUTRAL_GRAY_NOTE ? 0.5 : 1;

  // Apply additive blending when the global highlight mode requests it
  let augmentedPianoRoll = pianoRoll as AugmentedPianoRoll;
  const hl = augmentedPianoRoll.highlightMode ?? "file";
  const blend = hl === "highlight-blend" ? "add" : "normal";
  sprite.applyStyle(noteColor, alpha, blend);

  // Onset marker positioning -----------------------------------------
  const showOnsets = augmentedPianoRoll.showOnsetMarkers;
  const onsetSprites = augmentedPianoRoll.onsetSprites ??= [];
  const onsetSprite = onsetSprites[idx];
  const originalOnsetMap = augmentedPianoRoll.originalOnsetMap;
  const onlyOriginal = augmentedPianoRoll.onlyOriginalOnsets !== false;
  if (!onsetSprite) return;
  if (!showOnsets) return onsetSprite.visible = false;
  const fid = note.fileId || "";
  // Outline color near file’s base color; fall back to current note color
  const fileColors = augmentedPianoRoll.fileColors;
  const baseColorNum = fileColors?.[fid] ?? noteColor;
  const colorHex = "#" + baseColorNum.toString(16).padStart(6, "0");
  const onsetStyles = augmentedPianoRoll.onsetStyles || {};
  const style = onsetStyles[fid] || { shape: "circle", variant: "filled", size: 12, strokeWidth: 2 };
  // Only show marker for the original MIDI onset (avoid per-fragment markers)
  if (onlyOriginal && originalOnsetMap) {
    const key = `${fid}#${note.sourceIndex ?? -1}`;
    const origT = originalOnsetMap[key];
    if (origT === undefined || Math.abs(origT - note.time) > 1e-6) {
      onsetSprite.visible = false;
      return; // skip drawing marker for segmented fragments
    }
  }
  // Render as original shape marker with per-file stable kind
  onsetSprite.texture = getOnsetTextureByStyle(style as OnsetMarkerStyle, colorHex);
  onsetSprite.tint = 0xffffff; // no extra tint; texture carries stroke color
  onsetSprite.blendMode = "normal";
  onsetSprite.alpha = 0.95;
  // Size adapts to vertical zoom: scale preferred size by zoomY,
  // but never exceed the current row height (leave small padding)
  const preferred = Math.max(8, style.size || 12);
  const maxByRow = Math.max(6, Math.floor(height * 0.9));
  const target = preferred * zoomY;
  const sz = Math.max(6, Math.min(maxByRow, Math.floor(target)));
  onsetSprite.width = sz;
  onsetSprite.height = sz;
  onsetSprite.x = sprite.x - sz / 2; // at note start
  onsetSprite.y = sprite.y + height / 2 - sz / 2;
  onsetSprite.visible = true;
  onsetSprite.zIndex = (sprite.zIndex || 0) + 5;
}

/**
 * Default Sprite-based note renderer with automatic batching.
 *
 * Renders every MIDI note as a `PIXI.Sprite` that shares a common 1×1 white
 * texture. Color is applied via `tint`, and dimensions are set with
 * `sprite.width/height` for maximum batching efficiency.
 *
 * Compared to the legacy Graphics renderer this trades a small per-sprite
 * memory overhead for dramatically lower draw-call count once the number of
 * notes exceeds a few hundred.
 */
export function renderNotes(pianoRoll: PianoRoll): void {
  const pianoKeysOffset = pianoRoll.options.showPianoKeys ? 60 : 0;

  // Pre-compute constants for vertical sizing
  const noteRange = pianoRoll.options.noteRange.max - pianoRoll.options.noteRange.min;
  // Derive row height from pitchScale range so it automatically respects
  // reserved bottom space (e.g., waveform band) configured in createScales.
  const pitchMinY = pianoRoll.pitchScale(pianoRoll.options.noteRange.min);
  const pitchMaxY = pianoRoll.pitchScale(pianoRoll.options.noteRange.max);
  const usablePitchSpanPx = Math.abs(pitchMinY - pitchMaxY);
  const baseRowHeight = usablePitchSpanPx / Math.max(1, noteRange);
  const zoomY = pianoRoll.state.zoomY;

  // 1) Ensure Sprite pool size matches notes.length -----------------------
  handleSprites(pianoRoll, PIXI.Texture.WHITE);


  // 2) Update transform & style ------------------------------------------
  pianoRoll.notes.forEach((note: NoteData, idx: number) => renderPianoNote(pianoRoll, idx, note, pianoKeysOffset, zoomY, baseRowHeight));
}
