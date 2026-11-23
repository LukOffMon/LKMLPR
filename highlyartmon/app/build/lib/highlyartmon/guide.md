# HighlyArtMon guide for Claude

You draw with ops and see every result as an image. The user watches the editor live and may paint too (use `ham_read` to see their pixels). Quality comes from the loop, not from one big batch.

## The loop (follow it)
1. **Brief** — size, view (side, top-down, 3/4, iso, stack), game background, engine. Defaults: character 32x32 side view, origin bottom-center, bg = the game's dominant color.
2. **Palette as ramps** — 3–5 colors per material, dark→light. Hue-shift: shadows move toward blue/purple and lose saturation, highlights move toward yellow/orange. Keep one near-black outline color that is *not* pure black (e.g. #1b1020) and one highlight near-white. 8–16 colors for ≤32px; up to ~32 for 64px+. Index 1 should be the outline.
3. **Silhouette** — one `grid` op with only the outline/base color. View it (`review` shows the silhouette panel). It must read instantly at 1x: clear head/body/limb masses, exaggerated proportions (big head, hands and feet for small chars), a distinctive shape.
4. **Big shapes and light** — fill base colors per material, then decide ONE light direction (default top-left). Use `light` with the ramp or paint shadows as clusters on the side away from the light. No pillow shading (darkening every edge evenly).
5. **Outline** — 1px. Use selective outline: lighter (ramp-colored) outline on lit sides, dark on shadow sides and where shapes overlap. Interior lines only where forms separate.
6. **Details last** — eyes, highlights, texture. Every detail must survive 1x; if it is 1 lone pixel of a unique color it is probably noise.
7. **Lint and fix** — `ham_lint`, then fix every warn. Look again. Repeat until it reads well; tell the user what you improved.
8. **Export** — `ham_export` (GameMaker strips by default); report files and origin.

## Clean pixels
- **Lines**: steps should follow a regular progression (1-1-1, 2-2-2, 1-2-3-3-2-1 for curves). Avoid "jaggies": a step of 3 next to 1 next to 3.
- **No doubles**: an outline is 1px; avoid L-shaped corners (pixel-perfect lines).
- **Clusters**: group colors in readable clumps; avoid orphan pixels and noisy speckle.
- **Banding**: don't stack parallel color bands of equal width along an edge; vary the widths.
- **Anti-aliasing**: only on long curves, with an intermediate ramp color at step corners, and never on the outer silhouette edge for game sprites (it halos on other backgrounds).
- **Dithering**: sparingly, for large gradients or textures (`dither` op, pattern checker/25/75), not on small sprites.
- **Contrast**: the sprite must pop from the game background (`bg`). Check the panel on bg in `review`.

## Grid drawing tips
- Draw with `grid` rows; one char per pixel. Count characters per row: every row should be exactly the intended width (pad with '.').
- Use `mode: "over"` to paint details on top without erasing.
- Use `symmetry: "x"` or `mirror` for front views, then break symmetry slightly (hair, weapon, light) so it doesn't look stiff.
- Separate layers for body / clothes / weapon / effects so you can recolor and animate parts.

## Animation
- Keyframes first (contact, passing for walks; anticipation, action, recovery for attacks), then in-betweens.
- Typical: idle 4 frames × 120–180 ms (breathing = 1px body bob, not the feet); walk 6–8 × 80–100 ms; run 6 × 70 ms; attack 4–7 frames with a long anticipation, 1–2 fast smear frames, and a held recovery.
- Use `add_frame{copy_from}` then modify; `onion` view to check arcs; `sheet` to see the whole cycle. Keep the feet line fixed for idle/walk (lint warns on drift).
- Name ranges with `tag` (idle, walk, attack) — export makes one GameMaker sprite per tag.
- Secondary motion (hair, cape) lags 1 frame behind the body.

## Views beyond flat 2D
- **2.5D sprite stacking** (`mode: "stack"`): each layer is a horizontal slice of the object seen from above, bottom layer first. Draw slices like a CT scan (base → top). `ham_view` mode `stack` shows 8 rotations. In GameMaker, draw each slice with a y offset of -1 per slice and rotate with image_angle.
- **Isometric** (`mode: "iso"`): 2:1 lines (2 pixels across, 1 down). Tile footprint e.g. 32x16. Light the top face brightest, left face mid, right face darkest. Editor shows iso guides.
- **Top-down / 3/4**: show the top of the head and a bit of the front; shadows as a simple dark ellipse under the character on its own layer.
- **Tiles**: check seams with `ham_view` mode `tile`; avoid obvious repeating features.

## GameMaker
- Export creates `spr_<name>_<tag>_strip<N>.png` (GameMaker auto-slices `_stripN` on import) and a `.gml` with `sprite_add(file, N, false, false, ox, oy)`.
- Origin: characters bottom-center (feet), projectiles/items center. Set it with `origin`.
- Frame speed: GameMaker uses fps; the .gml comments the fps derived from frame durations.

## Working with generated art
`ham_import_png` turns an image (e.g. SpriteCook or other AI output) into an indexed sprite: it detects the upscaling factor and reduces colors. Then clean it: `cleanup` orphans, unify the outline with `replace`, fix the palette into ramps, and redraw the details that came out mushy.
