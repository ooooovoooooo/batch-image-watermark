#!/usr/bin/env python3
"""Serve the bundled watermark studio on the local computer."""

from __future__ import annotations

import argparse
import functools
import http.server
import threading
import webbrowser
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Launch the local watermark studio.")
    parser.add_argument("--host", default="127.0.0.1", help="Bind address (default: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=8127, help="Local port (default: 8127)")
    parser.add_argument("--no-open", action="store_true", help="Do not open a browser automatically")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    web_root = Path(__file__).resolve().parent.parent / "assets" / "watermark-studio"
    index_file = web_root / "index.html"
    if not index_file.is_file():
        raise SystemExit(f"Watermark Studio assets are missing: {index_file}")

    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(web_root))
    server = http.server.ThreadingHTTPServer((args.host, args.port), handler)
    url = f"http://{args.host}:{args.port}/"
    print(f"Watermark Studio is running at {url}")
    print("Press Ctrl+C to stop.")

    if not args.no_open:
        threading.Timer(0.35, webbrowser.open, args=(url,)).start()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nWatermark Studio stopped.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
