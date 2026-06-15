# Angle — Design Workspace Engine Specification

**Status:** v1 for Faisal's sign-off — 2026-06-15
**Scope:** the maker's Design room as a true **Photoshop + Illustrator equivalent** — one editor that does raster *and* vector in a single document, wired into Angle's brief → generative-AI → iterations → send-final loop.
**Supersedes:** the tldraw assumption in `ANGLE_FOCUS_MODE_SPEC.md` §3 (tldraw SDK 4.0 is paid in production — $6k/yr/team or a watermark; we replace it below).
**Licensing rule:** every dependency here is MIT / Apache-2.0 / BSD — safe to ship in a commercial product. No GPL source (GIMP/Krita/Inkscape can be *studied*, never linked), no paid SDKs (tldraw, Polotno, Pintura) in the critical path.

---

## 1. What "combining Photoshop and Illustrator" actually means

The two apps look different but converge on one data structure: **a layer stack where each layer is either vector (resolution-independent paths/shapes/text) or raster (a pixel buffer), composited through one pipeline of blend modes, masks, and non-destructive effects.** Photoshop already carries vector shape layers, type layers, and smart objects next to pixel layers; Illustrator already applies raster effects to vector art. The "combine" is not a merge of two codebases — it is **one document model that treats vector and raster as peer layer types in the same scene graph.**

That model is the product's moat and its file format. It is the one thing you cannot buy. Everything else is leverage.

**Scope honesty (even inside a full clone):** ship the *spine* first — document model, compositor, layers, vector paths, type, brushes, selections, non-destructive adjustments, PSD interop, generative fill. Defer the long tail (mesh gradients, perspective warp, advanced typography like multi-master, CMYK separations/print color management, video timeline). Those are real but they are not what wins the first agency.

---

## 2. The foundation stack

| Layer | Library | License | Role |
|---|---|---|---|
| **Renderer / compositor** | **PixiJS v8** | MIT | The single WebGL backbone. Layer textures, blend modes, filter pipeline, 60fps compositing of many layers + large images. |
| **Vector geometry (headless)** | **Paper.js** | MIT | Bezier math, boolean path ops (unite/subtract/intersect/exclude), offset/outline stroke, hit-testing. *Computes* geometry; PixiJS renders it. |
| **Type geometry (headless)** | **opentype.js** | MIT | Font parsing, glyph shaping, OpenType features, **text-to-outlines** (convert to curves). |
| **PSD interop** | **ag-psd** | MIT | Read **and write** Photoshop `.psd` with layers, masks, text, effects. The designer-adoption wedge. |
| **PDF / AI import** | **pdf.js** | Apache-2.0 | Rasterize/import PDF; `.ai` files are PDF-wrapped (partial import path). |
| **Pixel ops (WASM)** | **wasm-vips** + **Photon** | MIT / Apache | Fast resize, color transforms, convolutions off the main thread. |
| **AI selection / CV** | **OpenCV.js** + **onnxruntime-web** | Apache-2.0 / MIT | GrabCut, flood-fill magic wand, and **SAM** (Segment Anything) segmentation for "select subject/object." |
| **Stroke smoothing** | **perfect-freehand** | MIT | Input-path smoothing for ink/markup brushes (feeds both vector pen-pressure strokes and the raster brush stamper). |
| **Filter shaders** | **pixi-filters** + **glfx.js** (port shaders) | MIT | Starting GLSL for blur/sharpen/displacement/color; wrap them in our non-destructive layer model. |
| **Realtime doc + presence** | **Yjs** (+ y-websocket / y-webrtc) | MIT | CRDT collaboration on the document model and live cursors — the free, battle-tested replacement for `@tldraw/sync`. |
| **Color UI** | **@uiw/react-color** | MIT | Pickers, eyedropper, swatches. |
| **Vector export** | Paper.js `exportSVG` + custom serializer | MIT | SVG out. |
| **PDF/print export** | **pdf-lib** | MIT | Deliverable-grade PDF export. |

**One renderer, period.** PixiJS draws everything. Paper.js and opentype.js run *headless* (geometry only) and we render their output as Pixi `Graphics`/`Mesh`. This avoids the maintenance tax of running two canvas engines (the reason we do **not** pick Konva or Fabric for the pro surface — they're canvas-2D object models, fine for the lighter moodboard surface but the wrong substrate for a many-layer, GPU-composited, large-image editor). The existing moodboard/inspiration surface can keep whatever it uses today; the **pro editor canvas is PixiJS**.

---

## 3. The document model — built from scratch (the moat)

This is your `.psd`/`.ai` equivalent and the heart of the product. No library defines it.

```
Document
  ├─ artboards[]            (Illustrator multi-canvas; PS = single, but support N)
  ├─ colorProfile, dpi, dimensions, bleed/safe-area (print-aware)
  ├─ layerTree (ordered, nestable)
  │    ├─ Group        (folder, with its own blend/opacity/mask — pass-through or isolated)
  │    ├─ RasterLayer  (tiled pixel buffer; smart-object ref optional)
  │    ├─ VectorLayer  (paths/shapes — fill, stroke, dash, markers)
  │    ├─ TextLayer    (string + runs + path/area binding; live, re-editable)
  │    ├─ ShapeLayer   (parametric rect/ellipse/poly/line — editable params)
  │    ├─ SmartObject  (embedded/linked source doc, non-destructively transformed)
  │    ├─ AdjustmentLayer (curves/levels/hue — affects layers below, non-destructive)
  │    └─ each layer: { blendMode, opacity, fillOpacity, visible, locked,
  │                     mask: LayerMask?, clipping: bool, effects: Effect[],
  │                     transform: Matrix }
  └─ history (command stack), selection (active pixel mask + vector paths)
```

Design rules:
- **Vector and raster are peer layer types.** Rasterize is an explicit, reversible-until-flattened command, never implicit.
- **Non-destructive by default.** Transforms, adjustments, effects, and smart filters are *stored as instructions* and applied at composite time, not baked.
- **Immutable-friendly.** Structural edits go through a command/patch model (Immer for tree/props). Raster pixel edits use **tiled, dirty-region** snapshots — never full-buffer snapshots (memory death). History is a hybrid: patches for structure, tile diffs for pixels.
- **Serializable to a native format:** JSON doc + binary blobs (raster tiles, embedded fonts/profiles) in a zip container. This *is* the file format; PSD/SVG/PDF are import/export adapters around it.

---

## 4. Subsystems — leverage vs. build

For each: **▸ Take** (from a library) / **▸ Build** (from scratch).

### 4.1 Renderer & compositor
- ▸ Take: PixiJS render textures, scene graph, standard blend modes, filter framework, GPU texture management.
- ▸ Build: the **layer-tree → display** mapping; group isolation/pass-through; clipping masks; advanced Photoshop blend modes PixiJS lacks (color dodge/burn, soft/hard/vivid/linear light, pin light, difference, exclusion, hue/sat/color/luminosity) as custom GLSL; dirty-rect recompositing.

### 4.2 Layers, groups, masks
- ▸ Take: nothing — this is yours.
- ▸ Build: layer panel + reordering, nested groups, **layer masks** (raster) and **vector masks** (path-clipped), **clipping masks**, opacity vs. fill-opacity, lock states, smart objects (embedded/linked + non-destructive transform), adjustment layers.

### 4.3 Vector engine (the Illustrator half)
- ▸ Take: **Paper.js** for bezier geometry, boolean ops, path offset/outline-stroke, hit-testing; **opentype.js** for type-to-path.
- ▸ Build: the **Pen tool** (anchor/handle editing UX), direct-selection, path operations UI (Pathfinder-equivalent over Paper booleans), shape builder, stroke profiles/variable width, dashes/arrowheads, corner widgets, align/distribute, **live shapes** (parametric), gradient/pattern fills, and rendering the computed paths through PixiJS. Mesh gradients = deferred.

### 4.4 Raster paint engine (the Photoshop half)
- ▸ Take: **wasm-vips/Photon** for transforms/convolutions; PixiJS render textures as the pixel target.
- ▸ Build: tiled pixel buffers, the painting compositor (stamp onto a layer's render texture), fill/gradient tools, clone/heal (sample + composite), dodge/burn/smudge as shader passes, content-aware fill (mask → generative gateway, see 4.10).

### 4.5 Brush engine
The hardest raster piece; no shippable OSS brush engine exists (MyPaint/Krita are GPL — study only).
- ▸ Take: **perfect-freehand** for input-path smoothing/pressure outline.
- ▸ Build: a **GPU stamp-based brush engine** — stamp a brush-tip texture along the smoothed path with spacing, flow, opacity, scatter, jitter, rotation, tilt, and pressure dynamics, accumulated in a WebGL framebuffer. Brush presets, dual brush, texture, wet-edge. This is genuinely from scratch and is a flagship of "feels like Photoshop."

### 4.6 Selections & masking
- ▸ Take: **OpenCV.js** (GrabCut, contour ops) + **onnxruntime-web** running a **SAM** model for one-click subject/object selection; flood-fill for magic wand.
- ▸ Build: the selection model (active selection = pixel alpha mask **+** optional vector path), marquee/lasso/polygon/magnetic tools, quick-mask mode, feather/grow/contract/refine-edge, select-and-mask workspace, convert selection ↔ path ↔ layer mask. The AI selections are the "better than Photoshop on ease" moment.

### 4.7 Type engine
- ▸ Take: **opentype.js** for shaping, kerning, OpenType features, outlines.
- ▸ Build: live re-editable text layers, **point / area / type-on-path**, character & paragraph panels, leading/tracking/kerning UI, OpenType feature toggles, text wrap, and convert-to-outlines (→ vector layer). Multi-master/variable-font UI = phase 2.

### 4.8 Non-destructive effects, adjustments, filters
- ▸ Take: **pixi-filters** + ported **glfx.js**/custom GLSL for the primitive shaders; **wasm-vips** for CPU-side heavy filters.
- ▸ Build: the **non-destructive wrapper** — adjustment layers (levels, **curves**, hue/sat, color balance, selective color, gradient map, B&W), **smart filters** (re-editable filter stack on a layer), layer effects/styles (drop shadow, inner shadow, stroke, glow, bevel, overlays), and the parametric UI (the curves widget, levels histogram, etc.).

### 4.9 Color
- ▸ Take: **@uiw/react-color** widgets.
- ▸ Build: document color model (sRGB v1; ICC profile + CMYK soft-proof = print phase), swatches/global colors, gradient editor, eyedropper sampling against composited pixels, color harmonies.

### 4.10 Generative & AI tools (Angle's differentiator)
This is where you beat Adobe on *integration*, not brush count. All model calls route through the **generation aggregator gateway** (Nano Banana / Google Gemini image + GPT-Image / gpt-image-1 first), every call on Angle's **B1 governed-run ledger**, every output an **F3 asset version** with `generated_from` edges.
- ▸ Take: the gateway + model adapters (already specced); SAM/OpenCV for masks.
- ▸ Build:
  - **Generate to canvas** — prompt (seeded from the pinned brief, §8) → image → lands as a new raster/smart-object layer.
  - **Generative fill / inpaint** — active selection mask + prompt → gateway inpaint → composite back as a layer (selections × gateway).
  - **Generative expand / outpaint** — extend the artboard.
  - **AI background removal** (SAM/grabcut) and **AI upscale** (gateway model).
  - **Annotate → send it back → regenerate** — feedback pins/markup on a version become structured direction for the next governed round (the Springboard curation-as-direction law).

### 4.11 Import / export / interop
- ▸ Take: **ag-psd** (PSD read+write — the interop wedge; designers arrive with PSDs), **pdf.js** (PDF/AI import), Paper.js SVG export, **pdf-lib** (PDF export).
- ▸ Build: the **native format** (zip: JSON doc + tiled raster blobs + embedded fonts/profiles), adapters mapping our document model ↔ PSD/SVG/PDF, and PNG/JPEG/WebP flatten-export with export presets (sizes, retina, slices).

### 4.12 History / undo
- ▸ Take: Immer (structure patches).
- ▸ Build: hybrid history manager — patch-based for layer-tree/props, **tile-diff snapshots** for pixel edits; non-linear history states; merges cleanly with Yjs CRDT (collab-aware undo). Never snapshot whole buffers.

### 4.13 Performance architecture
- ▸ Take: WASM libs run in workers; `OffscreenCanvas`.
- ▸ Build: tile-based raster storage + dirty-region compositing; heavy ops (filters, large transforms, SAM, vips) in **Web Workers / OffscreenCanvas**; GPU compositing through PixiJS; lazy tile paging for large documents; throttled CRDT sync.

### 4.14 Realtime collaboration
- ▸ Take: **Yjs** + an awareness provider (y-websocket worker, or y-webrtc for p2p) — replaces `@tldraw/sync`, free and proven.
- ▸ Build: bind the document model to a Yjs doc (structure as shared types; raster tiles synced as binary updates or via blob refs), live cursors/selection presence on the canvas, and "viewer joining a running AI round polls instead of re-driving it."

---

## 5. What to take from each app (feature parity map)

**From Photoshop (raster):** layers + blend modes + masks, the brush engine, selections (incl. AI select-subject), adjustment layers & curves, smart objects & smart filters, layer styles, clone/heal, generative fill, PSD interop.

**From Illustrator (vector):** pen/anchor editing, Pathfinder (boolean ops), live/parametric shapes, variable-width strokes & profiles, type-on-path & area type, multiple artboards, align/distribute & shape builder, SVG/PDF vector export, convert-to-outlines.

**The combine (neither app does well, your edge):** one document with vector and raster as peer layers; the **brief pinned beside the canvas** driving generation; **generative AI as a first-class, governed tool** (fill/expand/upscale/remove-bg/generate); annotate-and-regenerate rounds; one-click **send final version** that versions an F3 asset and feeds the delivery/approval loop; realtime multi-maker presence.

---

## 6. The build-from-scratch list (consolidated — this is the IP)

1. The unified **document model** + native file format.
2. The **layer-tree → GPU compositor** mapping (groups, masks, clipping, full PS blend-mode set).
3. The **vector editing UX** over Paper.js geometry (pen, pathfinder, live shapes, strokes).
4. The **GPU brush engine**.
5. The **selection model** + AI-selection orchestration (SAM/GrabCut).
6. The **type engine UX** over opentype.js (point/area/path type, char/para panels).
7. The **non-destructive pipeline** (adjustment layers, smart filters, layer styles, curves UI).
8. The **generative tools** (generate/fill/expand/upscale/remove-bg) over the gateway + B1.
9. The **hybrid history** (patches + tile diffs) and **Yjs collaboration binding**.
10. The **tiling + worker + dirty-rect performance architecture**.
11. The **interop adapters** (model ↔ PSD/SVG/PDF) around ag-psd/pdf.js/Paper/pdf-lib.

Everything else is wiring around purchased-for-free leverage.

---

## 7. Build phases (each verified in a running browser, zero console errors)

| Phase | Deliverable | Done when |
|---|---|---|
| **DW-0 Spine** | PixiJS canvas + document model + layer tree/panel + pan/zoom + move/transform + raster layer from image + PNG export | Drop an image, add layers, reorder, transform, export — feels solid |
| **DW-1 Vector** | Paper.js geometry: pen, shapes, fills/strokes, boolean ops, SVG export | Draw and edit a real key-visual layout |
| **DW-2 Raster paint** | Brush engine, eraser, fills, layer masks, basic adjustments (levels/curves/hue) | Paint + mask + adjust non-destructively |
| **DW-3 Type** | opentype.js text layers, point/area/path type, char/para panels, convert-to-outlines | Set headline + body type on the canvas |
| **DW-4 Selections + AI** | Marquee/lasso/wand + SAM select-subject + refine edge + selection↔mask↔path | One-click cut out a subject |
| **DW-5 Generative** | Gateway generate-to-canvas, generative fill/expand, remove-bg, upscale — all B1-governed, F3-versioned | Brief-seeded prompt → layer; mask + prompt → fill |
| **DW-6 Effects + interop** | Smart filters, layer styles, adjustment layers; **PSD read/write** (ag-psd), PDF export | Import a real PSD, edit, export PSD + PDF |
| **DW-7 Collab + history** | Yjs presence + CRDT doc, hybrid undo, smart objects | Two makers in one document live |

DW-0 → DW-5 is the sellable wedge (a designer does real key-visual work, AI-assisted). DW-6/7 deepen it.

---

## 8. Wiring into Angle (no parallel spine)

- **Entry:** the Design task's focus mode (`?focus=1`) — the room *is* this editor full-screen.
- **Brief pinned (fix the dead panel):** pull the parent task's 11-field brief; show Single-minded message, Brand personality & style, Mandatories, Deliverables read-only beside the canvas; **seed the generative prompt from it** (no hardcoded Waha string).
- **Outputs:** every save / generated round = an **F3 asset version** on the task → proofing, packages, client hub see it natively.
- **AI:** every gateway call = a **B1 governed run** (policy + token/cost ledger + audit).
- **Send final version:** issues an approval request through the existing approval service; the green button is the one decisive action.
- **Events:** reuse `asset.version_added`, `approval.*`, `ai.run_*`; add `design.round_*` to the catalog for inbox/automations.

---

## 9. Decisions locked & open

**Locked:** PixiJS single renderer · Paper.js + opentype.js headless geometry · Yjs (not tldraw) for collab · ag-psd for PSD interop · SAM/OpenCV for AI selection · gateway (Nano Banana + GPT-Image) on B1 for all generation · unified vector+raster document model built from scratch.

**Open for Faisal:**
1. **CMYK / ICC / print color** in v1, or sRGB-only until an agency demands print separations? (Recommend defer.)
2. **`.ai` import depth** — best-effort via PDF, or skip and lean on PSD+SVG? (Recommend PSD+SVG first.)
3. **Collab infra** — stand up the Yjs websocket worker now, or single-editor-with-refresh through DW-5 and add presence at DW-7? (Recommend defer to DW-7.)
4. **Brush engine ambition** — match Photoshop dynamics in v1, or ship a strong default brush set and expand? (Recommend strong defaults first.)
