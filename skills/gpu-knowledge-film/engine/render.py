#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""《分母》GPU 渲染器：Chrome(Metal) + WebGL2 → 原始帧 POST → ffmpeg。
用法：
  python3 render.py stills 0.5,12,45 [--w 720 --h 960 --q draft]
  python3 render.py clip --from 40 --to 48 [--w 540 --h 720 --q draft --out out/clip.mp4]
  python3 render.py full [--q final --w 1440 --h 1920 --out out/film.mp4]
"""
import argparse, asyncio, glob, io, json, os, subprocess, sys, threading, time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parent
# Mac 用 Playwright 下载的完整版 Chromium 才走得了 Metal；其它系统交给 Playwright 自己找
CHROME = (sorted(glob.glob(os.path.expanduser("~/Library/Caches/ms-playwright/chromium-*/chrome-mac*/*.app/Contents/MacOS/*"))) or [None])[-1]
ANGLE = {"darwin": "metal", "win32": "d3d11"}.get(sys.platform, "vulkan")

class St:
    ff = None; frames = 0; t0 = 0.0; total = 0; out = None; w = 0; h = 0

class H(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=str(ROOT), **k)
    def log_message(self, *a): pass
    def end_headers(self):
        self.send_header("Cache-Control", "no-store"); super().end_headers()
    def do_POST(self):
        u = urlparse(self.path); q = parse_qs(u.query)
        n = int(self.headers.get("Content-Length", 0)); body = self.rfile.read(n)
        if u.path == "/frame":
            i = int(q.get("i", [St.frames])[0])
            if i == St.frames and len(body) == St.w * St.h * 4:
                St.ff.stdin.write(body); St.frames += 1
            if St.frames % 30 == 0 or St.frames == St.total:
                el = time.time() - St.t0; fps = St.frames / max(el, 1e-6)
                print(f"\r帧 {St.frames}/{St.total}  {fps:.1f} fps  剩 {(St.total-St.frames)/max(fps,1e-6):.0f}s   ", end="", flush=True)
        elif u.path == "/still":
            from PIL import Image
            w, h = int(q["w"][0]), int(q["h"][0]); name = q["name"][0]
            im = Image.frombytes("RGBA", (w, h), body).transpose(Image.FLIP_TOP_BOTTOM).convert("RGB")
            p = ROOT / "out" / name; p.parent.mkdir(parents=True, exist_ok=True)
            im.save(p, quality=93)
        elif u.path == "/json":
            p = ROOT / q["name"][0]; p.write_bytes(body)
        elif u.path == "/log":
            print("[page]", body.decode("utf8", "ignore"), flush=True)
        self.send_response(204); self.end_headers()

class Srv(ThreadingHTTPServer):
    request_queue_size = 512      # 默认只有 5，Chrome 并发取模块时会被重置
    daemon_threads = True

def serve():
    s = Srv(("127.0.0.1", 0), H); threading.Thread(target=s.serve_forever, daemon=True).start()
    return s, s.server_address[1]

async def with_page(port, w, h, q, fps, fn):
    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True, executable_path=CHROME, args=[
            f"--use-angle={ANGLE}", "--ignore-gpu-blocklist", "--enable-gpu-rasterization", "--disable-gpu-watchdog",
            "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows",
            "--force-color-profile=srgb", "--autoplay-policy=no-user-gesture-required"])
        pg = await b.new_page(viewport=dict(width=max(w, 400), height=max(h, 400)))
        pg.on("console", lambda m: print("[js]", m.text, flush=True) if m.type in ("error", "warning") or m.text.startswith("#") else None)
        pg.on("pageerror", lambda e: print("[pageerror]", e, flush=True))
        await pg.goto(f"http://127.0.0.1:{port}/index.html?w={w}&h={h}&q={q}&fps={fps}", wait_until="load")
        await pg.wait_for_function("window.FILM && window.FILM.isReady===true", timeout=180000)
        await fn(pg)
        await b.close()

def open_ff(w, h, fps, out, crf):
    Path(out).parent.mkdir(parents=True, exist_ok=True)
    cmd = ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", f"{w}x{h}", "-r", str(fps), "-i", "-",
           "-vf", "vflip,format=yuv420p", "-c:v", "libx264", "-preset", "medium", "-crf", str(crf),
           "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709", "-movflags", "+faststart", str(out)]
    return subprocess.Popen(cmd, stdin=subprocess.PIPE, bufsize=1 << 24)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("mode"); ap.add_argument("times", nargs="?", default="")
    ap.add_argument("--w", type=int, default=0); ap.add_argument("--h", type=int, default=0)
    ap.add_argument("--q", default=""); ap.add_argument("--fps", type=int, default=30)
    ap.add_argument("--from", dest="a", type=float, default=0); ap.add_argument("--to", dest="b", type=float, default=0)
    ap.add_argument("--out", default=""); ap.add_argument("--crf", type=int, default=15); ap.add_argument("--prefix", default="s")
    a = ap.parse_args()
    if a.mode in ("stills", "cover"):
        w, h, q = a.w or 720, a.h or 960, a.q or "draft"
    elif a.mode == "clip":
        w, h, q = a.w or 540, a.h or 720, a.q or "draft"
    else:
        w, h, q = a.w or 1440, a.h or 1920, a.q or "final"
    srv, port = serve()
    async def go(pg):
        if a.mode == "stills":
            ts = [float(x) for x in a.times.split(",") if x != ""]
            t0 = time.time()
            r = await pg.evaluate("([ts,p])=>window.FILM.stills(ts,p)", [ts, a.prefix])
            print(f"{len(ts)} 张，{(time.time()-t0)/max(1,len(ts))*1000:.0f} ms/张", r or "")
        elif a.mode == "cover":
            for k in a.times.split(","):
                await pg.evaluate("([k,n])=>window.FILM.coverShot(k,n)", [k, f"cover_{k}_{w}x{h}.png"])
            print("covers", a.times)
        elif a.mode == "events":
            ev = await pg.evaluate("window.FILM.eventList()")
            (ROOT / "audio" / "events.json").write_text(json.dumps(ev, ensure_ascii=False, indent=0))
            print(len(ev), "events")
        else:
            dur = await pg.evaluate("window.FILM.duration")
            f0 = int(round(a.a * a.fps)); f1 = int(round((a.b or dur) * a.fps))
            St.total = f1 - f0; St.t0 = time.time(); St.w = w; St.h = h; St.frames = 0
            St.ff = open_ff(w, h, a.fps, a.out or str(ROOT / "out" / ("clip.mp4" if a.mode == "clip" else "film.mp4")), a.crf)
            await pg.evaluate("([a,b])=>window.FILM.run(a,b)", [f0, f1])
            St.ff.stdin.close(); St.ff.wait()
            print(f"\n完成 {St.total} 帧，用时 {time.time()-St.t0:.0f}s → {a.out}")
    asyncio.run(with_page(port, w, h, q, a.fps, go))
    srv.shutdown()

if __name__ == "__main__":
    main()
