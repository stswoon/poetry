#!/usr/bin/env python3
"""Раздаёт готовый ролик по локальной сети: страница с плеером, обложкой и голосом.

  python3 utils/lan-share/serve.py "texts/<Поэт>/<Стих>" [--port 8770]

Отдаёт только ролик, cover.png и voice.mp3 из папки стиха, остальное недоступно.
Ролик — самая старшая версия «<Стих> - <Поэт> - vN.mp4», в старых папках video.mp4.
Поддерживает Range: без него видео не перематывается, а Safari на iPhone его не играет.
"""
import argparse
import html
import re
import socket
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

FILES = {"video.mp4": "video/mp4", "cover.png": "image/png", "voice.mp3": "audio/mpeg"}
CHUNK = 1024 * 1024


def lan_ip():
    # UDP-сокет ничего не отправляет: он только показывает, какой адрес смотрит в сеть
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("10.255.255.255", 1))
        return s.getsockname()[0]
    except OSError:
        return "127.0.0.1"
    finally:
        s.close()


def find_video(folder):
    def version(path):
        m = re.search(r" - v(\d+)\.mp4$", path.name, re.I)
        return int(m.group(1)) if m else -1

    videos = sorted(folder.glob("*.mp4"), key=version)
    if videos and version(videos[-1]) >= 0:
        return videos[-1]
    old = folder / "video.mp4"
    return old if old.is_file() else None


def make_handler(folder, title, video):
    paths = {n: video if n == "video.mp4" else folder / n for n in FILES}

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *args):
            pass

        def do_HEAD(self):
            self.respond(head=True)

        def do_GET(self):
            self.respond(head=False)

        def respond(self, head):
            name = self.path.split("?")[0].lstrip("/")
            if name == "":
                return self.send_page(head)
            if name not in FILES or not paths[name].is_file():
                self.send_error(404)
                return
            self.send_file(paths[name], FILES[name], head)

        def send_page(self, head):
            t = html.escape(title)
            links = "".join(f'<a href="/{n}" download>{n}</a> ' for n in FILES if paths[n].is_file())
            body = f"""<!doctype html><html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>{t}</title>
<style>body{{margin:0 auto;max-width:960px;padding:16px;background:#111;color:#eee;font:16px sans-serif}}
video{{width:100%;background:#000}}a{{color:#ffd24a;margin-right:16px}}</style></head>
<body><h1>{t}</h1><video controls playsinline preload="metadata" poster="/cover.png" src="/video.mp4"></video>
<p>Скачать: {links}</p></body></html>""".encode("utf8")
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            if not head:
                self.wfile.write(body)

        def send_file(self, path, ctype, head):
            size = path.stat().st_size
            start, end = 0, size - 1
            m = re.fullmatch(r"bytes=(\d*)-(\d*)", self.headers.get("Range", ""))
            if m and (m.group(1) or m.group(2)):
                if m.group(1):
                    start = int(m.group(1))
                    end = min(int(m.group(2)), size - 1) if m.group(2) else size - 1
                else:
                    start = max(0, size - int(m.group(2)))
                if start > end:
                    self.send_response(416)
                    self.send_header("Content-Range", f"bytes */{size}")
                    self.end_headers()
                    return
                self.send_response(206)
                self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
            else:
                self.send_response(200)
            self.send_header("Content-Type", ctype)
            self.send_header("Accept-Ranges", "bytes")
            self.send_header("Content-Length", str(end - start + 1))
            self.end_headers()
            if head:
                return
            with path.open("rb") as f:
                f.seek(start)
                left = end - start + 1
                try:
                    while left > 0:
                        chunk = f.read(min(CHUNK, left))
                        if not chunk:
                            break
                        self.wfile.write(chunk)
                        left -= len(chunk)
                except (BrokenPipeError, ConnectionResetError):
                    pass  # зритель перемотал или закрыл страницу

    return Handler


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("folder", help="папка стиха")
    ap.add_argument("--port", type=int, default=8770, help="первый порт для попытки, занятые пропускаются")
    args = ap.parse_args()
    folder = Path(args.folder).resolve()
    video = find_video(folder)
    if video is None:
        sys.exit(f"Нет ролика в {folder}")
    handler = make_handler(folder, folder.name, video)
    for port in range(args.port, args.port + 20):
        try:
            server = ThreadingHTTPServer(("0.0.0.0", port), handler)
            break
        except OSError:
            continue
    else:
        sys.exit("Нет свободного порта")
    print(f"LAN_URL: http://{lan_ip()}:{port}/", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
