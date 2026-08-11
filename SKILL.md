---
name: batch-image-watermark
description: Batch-add text or logo watermarks to existing image files on macOS while preserving originals. Use when the user asks to add a watermark, logo, brand mark, copyright text, corner mark, centered mark, or tiled anti-theft mark to one image or a folder of JPG, JPEG, PNG, HEIC, TIFF, BMP, GIF, or WebP images; also use for consistent watermark position, opacity, scale, margin, output format, or recursive folder processing.
---

# Batch Image Watermark

Follow the same three-stage interaction as the referenced online tool: select images, configure the watermark, then export the processed images. Use the bundled local Python script for deterministic batch processing; images stay on the computer and source files are never overwritten.

## Runtime

Use Python 3.9 or newer with Pillow. First try the active `python3`. If `import PIL` fails, create an isolated environment and install `requirements.txt`; do not modify the user's system Python.

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
```

## Workflow

1. Resolve the exact input file or folder and inspect a representative image.
2. Configure the watermark:
   - Use `--text` for a text watermark.
   - Use `--logo` for a PNG, JPG, PDF, or SVG logo file.
   - Never use both in one run.
   - Text: content, font size, color.
   - Image: logo file and relative width.
   - Both: visible opacity from 0–100%, rotation angle, and `single` or `tile` arrangement.
3. Default to the reference tool's familiar setup: opacity `80`, rotation `-45`, and `single` layout. Use center placement for a single watermark.
4. Run `scripts/watermark.py`. For a large or visually diverse set, process one representative image first and inspect it before the full batch.
5. Export to a separate sibling folder named `<input>-watermarked`.
6. Verify the output count, inspect at least one output, and report skipped or failed files separately.

## Command

```bash
python3 scripts/watermark.py \
  --input "/absolute/path/to/images" \
  --output "/absolute/path/to/images-watermarked" \
  --logo "/absolute/path/to/logo.png" \
  --opacity 80 \
  --rotation -45 \
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
  --rotation -45 \
  --layout single
```

## Options

- `--layout`: `single` or `tile`, matching the reference site's arrangement choice.
- `--rotation`: any angle in degrees; common quick choices are `-45`, `0`, and `45`.
- `--opacity`: visible opacity from `0` to `100`.
- `--font-size`: fixed pixel size; `--font-ratio` gives more consistent proportions across mixed resolutions.
- `--logo-width`: logo width as a fraction of image width.
- Positions for a single mark: `top-left`, `top-center`, `top-right`, `center`, `bottom-left`, `bottom-center`, `bottom-right`.
- `--margin`: fraction of the shorter image edge.
- `--format`: `preserve`, `png`, or `jpeg`. Preserve keeps PNG/JPEG; other source formats become PNG.
- `--quality`: JPEG quality from `1` to `100`, default `92`.
- `--recursive`: include supported images in subfolders while retaining their folder structure.
- `--color`: text color as `#RRGGBB`, default `#FFFFFF`.
- `--font`: path to a `.ttf`, `.otf`, or `.ttc` font. Without this option, the script searches common macOS, Windows, and Linux fonts.

## Safety and quality

- Always write to a separate output directory. Refuse an output path identical to the input directory.
- Preserve source files and do not remove metadata claims from the user without warning; this script renders new images and does not promise metadata preservation.
- Group highly different aspect ratios or resolutions when one fixed visual size looks inconsistent.
- Use transparent PNG logos when possible. Maintain the logo aspect ratio.
- Treat output files as complete only after successful decoding, output-count verification, and visual inspection.
