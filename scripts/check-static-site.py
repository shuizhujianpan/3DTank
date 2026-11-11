#!/usr/bin/env python3
"""Check the static game's local references and browser-style HTTP loading."""

from html.parser import HTMLParser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from functools import partial
from threading import Thread
from urllib.parse import unquote, urlsplit
from urllib.request import urlopen
import re
import sys


ROOT = Path(__file__).resolve().parent.parent
APP_JS = ROOT / "app.js"
STATIC_IMPORT = re.compile(r"(?m)^\s*import\s+(?:(?:[^'\"]+?)\s+from\s+)?['\"]([^'\"]+)['\"]")
JAVASCRIPT_MIME_TYPES = {"application/javascript", "text/javascript"}


class LocalReferences(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.references = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "script" and attrs.get("src"):
            self.references.append((attrs["src"], "index.html", attrs.get("type") == "module"))
        elif tag == "link" and attrs.get("href"):
            self.references.append((attrs["href"], "index.html", False))


class QuietHTTPRequestHandler(SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass


def local_target(reference, source_file):
    parsed = urlsplit(reference)
    if parsed.scheme or parsed.netloc or not parsed.path:
        return None

    path = Path(unquote(parsed.path).lstrip("/")) if parsed.path.startswith("/") else Path(source_file).parent / unquote(parsed.path)
    target = (ROOT / path).resolve()
    try:
        relative = target.relative_to(ROOT)
    except ValueError:
        raise ValueError(f"local reference escapes the repository: {reference}")
    return relative


def main():
    failures = []
    resources = {}

    parser = LocalReferences()
    parser.feed((ROOT / "index.html").read_text(encoding="utf-8"))
    references = list(parser.references)
    references.extend((reference, "app.js", True) for reference in STATIC_IMPORT.findall(APP_JS.read_text(encoding="utf-8")))
    scanned_modules = set()

    while references:
        reference, source_file, is_module = references.pop()
        try:
            relative = local_target(reference, source_file)
        except ValueError as error:
            failures.append(str(error))
            continue
        if relative is None:
            continue
        target = ROOT / relative
        if not target.is_file():
            failures.append(f"missing local resource referenced by {source_file}: {reference}")
            continue
        resources[relative.as_posix()] = resources.get(relative.as_posix(), False) or is_module or target.suffix == ".js"
        if target.suffix == ".js" and relative.as_posix() not in scanned_modules:
            scanned_modules.add(relative.as_posix())
            references.extend((child, relative.as_posix(), True) for child in STATIC_IMPORT.findall(target.read_text(encoding="utf-8")))

    if failures:
        for failure in failures:
            print(f"ERROR: {failure}", file=sys.stderr)
        return 1

    resources = {"index.html": False, **resources}
    handler = partial(QuietHTTPRequestHandler, directory=str(ROOT))
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    server_thread = Thread(target=server.serve_forever, daemon=True)
    server_thread.start()
    base_url = f"http://127.0.0.1:{server.server_port}/"
    try:
        for path, is_javascript in resources.items():
            try:
                with urlopen(base_url + path, timeout=5) as response:
                    if response.status != 200:
                        failures.append(f"HTTP {response.status} while loading /{path}")
                        continue
                    response.read()
                    content_type = response.headers.get_content_type()
                    if is_javascript and content_type not in JAVASCRIPT_MIME_TYPES:
                        failures.append(f"unexpected JavaScript MIME type for /{path}: {content_type}")
            except Exception as error:
                failures.append(f"HTTP request failed for /{path}: {error}")
    finally:
        server.shutdown()
        server.server_close()
        server_thread.join(timeout=5)

    if failures:
        for failure in failures:
            print(f"ERROR: {failure}", file=sys.stderr)
        return 1

    print(f"Checked {len(resources)} local resources over HTTP; all returned 200 and JavaScript modules used an accepted MIME type.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
