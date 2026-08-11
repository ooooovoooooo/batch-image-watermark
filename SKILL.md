---
name: batch-image-watermark
description: Batch-add text or logo watermarks to existing images while preserving originals, or launch a local visual watermark editor. Use when the user asks to add a watermark, logo, brand mark, copyright text, corner mark, centered mark, or tiled anti-theft mark to one image or a folder; configure position, opacity, rotation, scale, spacing, or output format; or open, start, or use a local browser-based watermark tool.
---

# Batch Image Watermark

Use either the bundled Python batch processor or the local visual editor. Both follow three stages: select images, configure the watermark, then export the processed images. Images stay on the computer and source files are never overwritten.

## Choose a mode

- Use **batch mode** for repeatable processing, folders, subfolders, and exact automation.
- Use **web mode** when the user wants a visual interface, live preview, or manual adjustment.

## Web mode

Launch the bundled website with Python 3.9 or newer; Pillow is not required:

```bash
python3 scripts/serve_web.py
```

Open `http://127.0.0.1:8127/` if the browser does not open automatically. Keep the command running while using the page and press `Ctrl+C` to stop it. The default loopback address makes the site available only on the local computer.

The page supports batch image selection, text and Logo watermarks, live preview, single or tiled arrangement, direct numeric inputs for opacity, rotation from 0–360 degrees, adjustable tile spacing, and ZIP download.

## Batch runtime

Use Python 3.9 or newer with Pillow. First try the active `python3`. If `import PIL` fails, create an isolated environment and install `requirements.txt`; do not modify the user's system Python.

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
```

## Batch workflow

1. Resolve the exact input file or folder and inspect a representative image.
2. Configure the watermark:
   - Use `--text` for a text watermark.
   - Use `--logo` for a supported raster Logo such as PNG, JPEG, or WebP.
   - Never use both in one run.
   - Text: content, font size, color.
   - Image: Logo file and relative width.
   - Both: visible opacity from 0–100%, rotation angle, and `single` or `tile` arrangement.
3. Default to opacity `80`, rotation `315`, and `single` layout. Use center placement for a single watermark.
4. Run `scripts/watermark.py`. For a large or visually diverse set, process one representative image first and inspect it before the full batch.
5. Export to a separate sibling folder named `<input>-watermarked`.
6. Verify the output count, inspect at least one output, and report skipped or failed files separately.

## Batch command

```bash
python3 scripts/watermark.py \
  --input "/absolute/path/to/images" \
  --output "/absolute/path/to/images-watermarked" \
  --logo "/absolute/path/to/logo.png" \
  --opacity 80 \
  --rotation 315 \
  --layout tile
```

Text example:

```bash
python3 scripts/watermark.py \
  --input "/absolute/path/to/image.jpg" \
  --output "/absolute/path/to/output" \
  --text "Tsuki 奢袋馆" \
  --font-ratio 0.05 \
  --color "#FFFFFF" \
  --opacity 80 \
  --rotation 315 \
  --layout single
```

## Batch options

- `--layout`: `single` or `tile`.
- `--rotation`: any angle in degrees; common choices are `0`, `45`, and `315`.
- `--opacity`: visible opacity from `0` to `100`.
- `--gap`: tiled-watermark spacing as a fraction of the shorter image edge.
- `--font-size`: fixed pixel size; `--font-ratio` gives more consistent proportions across mixed resolutions.
- `--logo-width`: Logo width as a fraction of image width.
- Positions for a single mark: `top-left`, `top-center`, `top-right`, `center`, `bottom-left`, `bottom-center`, `bottom-right`.
- `--margin`: fraction of the shorter image edge.
- `--format`: `preserve`, `png`, or `jpeg`. Preserve keeps PNG/JPEG; other source formats become PNG.
- `--quality`: JPEG quality from `1` to `100`, default `92`.
- `--recursive`: include supported images in subfolders while retaining their folder structure.
- `--color`: text color as `#RRGGBB`, default `#FFFFFF`.
- `--font`: path to a `.ttf`, `.otf`, or `.ttc` font. Without this option, the script searches common macOS, Windows, and Linux fonts.

## Safety and quality

- Always write batch results to a separate output directory. Refuse an output path identical to the input directory.
- Preserve source files. The tools render new images and do not promise metadata preservation.
- Group highly different aspect ratios or resolutions when one fixed visual size looks inconsistent.
- Use transparent PNG Logos when possible and maintain their aspect ratio.
- Treat output files as complete only after successful decoding, output-count verification, and visual inspection.
