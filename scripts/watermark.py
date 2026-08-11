#!/usr/bin/env python3
"""Batch-add text or image watermarks without changing source files."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path
from typing import Optional

try:
    from PIL import Image, ImageColor, ImageDraw, ImageFont, ImageOps
except ImportError:
    print(
        "ERROR\tPillow is required. Create a virtual environment and run: "
        "python -m pip install -r requirements.txt",
        file=sys.stderr,
    )
    raise SystemExit(2)

SUPPORTED = {".jpg", ".jpeg", ".png", ".heic", ".heif", ".tif", ".tiff", ".bmp", ".gif", ".webp"}
FONT_CANDIDATES = (
    Path("/System/Library/Fonts/STHeiti Medium.ttc"),
    Path("/System/Library/Fonts/Supplemental/Arial Unicode.ttf"),
    Path("C:/Windows/Fonts/msyh.ttc"),
    Path("C:/Windows/Fonts/simhei.ttf"),
    Path("/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"),
    Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
)


def parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="Batch-add a text or image watermark.")
    p.add_argument("--input", required=True, type=Path, help="Image file or folder")
    p.add_argument("--output", required=True, type=Path, help="Separate output folder")
    mark = p.add_mutually_exclusive_group(required=True)
    mark.add_argument("--text", help="Watermark text")
    mark.add_argument("--logo", type=Path, help="Watermark image")
    p.add_argument("--font", type=Path, help="TTF, OTF, or TTC font path")
    p.add_argument("--font-size", type=int, help="Fixed font size in pixels")
    p.add_argument("--font-ratio", type=float, default=0.05, help="Font size as fraction of shorter image edge")
    p.add_argument("--color", default="#FFFFFF", help="Text color, e.g. #FFFFFF")
    p.add_argument("--opacity", type=int, default=80, help="Visible opacity, 0-100")
    p.add_argument("--rotation", type=float, default=-45, help="Rotation in degrees")
    p.add_argument("--layout", choices=("single", "tile"), default="single")
    p.add_argument("--logo-width", type=float, default=0.22, help="Logo width as fraction of base image width")
    p.add_argument("--gap", type=float, default=0.10, help="Tile gap as fraction of shorter image edge")
    p.add_argument("--position", choices=("top-left", "top-center", "top-right", "center", "bottom-left", "bottom-center", "bottom-right"), default="center")
    p.add_argument("--margin", type=float, default=0.03, help="Edge margin as fraction of shorter image edge")
    p.add_argument("--format", choices=("preserve", "png", "jpeg"), default="preserve")
    p.add_argument("--quality", type=int, default=92, help="JPEG quality, 1-100")
    p.add_argument("--recursive", action="store_true")
    return p


def validate(args: argparse.Namespace) -> None:
    if not args.input.exists():
        raise ValueError(f"Input does not exist: {args.input}")
    if args.input.resolve() == args.output.resolve():
        raise ValueError("Output must differ from input")
    if not 0 <= args.opacity <= 100:
        raise ValueError("Opacity must be from 0 to 100")
    if not 1 <= args.quality <= 100:
        raise ValueError("Quality must be from 1 to 100")
    if args.font_size is not None and args.font_size < 1:
        raise ValueError("Font size must be positive")
    if args.font_ratio <= 0 or args.logo_width <= 0 or args.gap < 0 or args.margin < 0:
        raise ValueError("Ratios must be positive; gap and margin may be zero")
    if args.logo and not args.logo.exists():
        raise ValueError(f"Logo does not exist: {args.logo}")
    if args.font and not args.font.exists():
        raise ValueError(f"Font does not exist: {args.font}")


def resolve_font(requested: Optional[Path]) -> Path:
    if requested:
        return requested
    for candidate in FONT_CANDIDATES:
        if candidate.exists():
            return candidate
    raise ValueError("No usable font found; provide one with --font /path/to/font.ttf")


def discover(source: Path, recursive: bool) -> list[tuple[Path, Path]]:
    if source.is_file():
        if source.suffix.lower() not in SUPPORTED:
            raise ValueError(f"Unsupported image type: {source.suffix}")
        return [(source, Path(source.name))]
    iterator = source.rglob("*") if recursive else source.glob("*")
    return [(p, p.relative_to(source)) for p in sorted(iterator) if p.is_file() and p.suffix.lower() in SUPPORTED]


def text_mark(args: argparse.Namespace, base_size: tuple[int, int]) -> Image.Image:
    font_size = args.font_size or max(10, round(min(base_size) * args.font_ratio))
    font = ImageFont.truetype(str(resolve_font(args.font)), font_size)
    box = ImageDraw.Draw(Image.new("L", (1, 1))).textbbox((0, 0), args.text, font=font, stroke_width=0)
    width, height = box[2] - box[0], box[3] - box[1]
    pad = max(4, round(font_size * 0.35))
    mark = Image.new("RGBA", (width + pad * 2, height + pad * 2), (0, 0, 0, 0))
    color = ImageColor.getrgb(args.color) + (round(255 * args.opacity / 100),)
    ImageDraw.Draw(mark).text((pad - box[0], pad - box[1]), args.text, font=font, fill=color)
    return mark


def logo_mark(args: argparse.Namespace, base_size: tuple[int, int]) -> Image.Image:
    mark = Image.open(args.logo).convert("RGBA")
    target_width = max(1, round(base_size[0] * args.logo_width))
    mark.thumbnail((target_width, max(1, round(base_size[1] * 0.8))), Image.Resampling.LANCZOS)
    if mark.width != target_width:
        target_height = max(1, round(mark.height * target_width / mark.width))
        mark = mark.resize((target_width, target_height), Image.Resampling.LANCZOS)
    alpha = mark.getchannel("A").point(lambda value: round(value * args.opacity / 100))
    mark.putalpha(alpha)
    return mark


def rotate(mark: Image.Image, degrees: float) -> Image.Image:
    return mark.rotate(-degrees, expand=True, resample=Image.Resampling.BICUBIC)


def position(base: tuple[int, int], mark: tuple[int, int], name: str, margin: int) -> tuple[int, int]:
    bw, bh = base
    mw, mh = mark
    x = {"left": margin, "center": (bw - mw) // 2, "right": bw - mw - margin}
    y = {"top": margin, "center": (bh - mh) // 2, "bottom": bh - mh - margin}
    if name == "center":
        return x["center"], y["center"]
    vertical, horizontal = name.split("-")
    return x[horizontal], y[vertical]


def composite(base: Image.Image, mark: Image.Image, args: argparse.Namespace) -> Image.Image:
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    if args.layout == "single":
        margin = round(min(base.size) * args.margin)
        layer.alpha_composite(mark, position(base.size, mark.size, args.position, margin))
    else:
        gap = round(min(base.size) * args.gap)
        step_x, step_y = mark.width + gap, mark.height + gap
        row = 0
        for y in range(-mark.height, base.height + mark.height, max(1, step_y)):
            offset = -(step_x // 2) if row % 2 else -mark.width
            for x in range(offset, base.width + mark.width, max(1, step_x)):
                layer.alpha_composite(mark, (x, y))
            row += 1
    return Image.alpha_composite(base.convert("RGBA"), layer)


def destination_for(source: Path, relative: Path, output: Path, fmt: str) -> tuple[Path, str]:
    if fmt == "png":
        return output / relative.with_suffix(".png"), "PNG"
    if fmt == "jpeg":
        return output / relative.with_suffix(".jpg"), "JPEG"
    if source.suffix.lower() in {".jpg", ".jpeg"}:
        return output / relative, "JPEG"
    if source.suffix.lower() == ".png":
        return output / relative, "PNG"
    return output / relative.with_suffix(".png"), "PNG"


def main() -> int:
    args = parser().parse_args()
    try:
        validate(args)
        files = discover(args.input, args.recursive)
    except (ValueError, OSError) as exc:
        print(f"ERROR\t{exc}", file=sys.stderr)
        return 2
    if not files:
        print("ERROR\tNo supported images found", file=sys.stderr)
        return 2
    succeeded = failed = 0
    for source, relative in files:
        try:
            with Image.open(source) as opened:
                base = ImageOps.exif_transpose(opened).convert("RGBA")
            mark = text_mark(args, base.size) if args.text is not None else logo_mark(args, base.size)
            result = composite(base, rotate(mark, args.rotation), args)
            destination, file_format = destination_for(source, relative, args.output, args.format)
            destination.parent.mkdir(parents=True, exist_ok=True)
            save_args = {"quality": args.quality, "optimize": True} if file_format == "JPEG" else {"optimize": True}
            if file_format == "JPEG":
                result = result.convert("RGB")
            result.save(destination, file_format, **save_args)
            with Image.open(destination) as check:
                check.verify()
            succeeded += 1
            print(f"OK\t{source}\t->\t{destination}")
        except Exception as exc:  # continue so one bad input does not lose the batch
            failed += 1
            print(f"FAIL\t{source}\t{exc}", file=sys.stderr)
    print(f"SUMMARY\tsucceeded={succeeded}\tfailed={failed}\ttotal={len(files)}")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
