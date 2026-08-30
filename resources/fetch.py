#!/usr/bin/env python3
import os
import re
import time
import urllib.request

REPO = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(REPO, "raw")
GETTING_REAL = "https://basecamp.com/gettingreal"

ESSAYS = {
    "pg-do-things-that-dont-scale.html": "https://paulgraham.com/ds.html",
    "pg-how-to-get-startup-ideas.html": "https://paulgraham.com/startupideas.html",
    "pg-startup-equals-growth.html": "https://paulgraham.com/growth.html",
    "pg-be-relentlessly-resourceful.html": "https://paulgraham.com/relres.html",
    "pg-how-to-make-wealth.html": "https://paulgraham.com/wealth.html",
    "pg-schlep-blindness.html": "https://paulgraham.com/schlep.html",
    "pg-startup-mistakes.html": "https://paulgraham.com/startupmistakes.html",
    "pg-users.html": "https://paulgraham.com/newideas.html",
    "saas-starter-stack.md": "https://raw.githubusercontent.com/timb-103/saas-starter-stack/main/README.md",
    "open-saas.md": "https://raw.githubusercontent.com/wasp-lang/open-saas/main/README.md",
    "getting-real.html": GETTING_REAL,
}


def download(url, path):
    if os.path.exists(path) and os.path.getsize(path) > 0:
        return False
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(request, timeout=45) as response:
        open(path, "wb").write(response.read())
    time.sleep(0.2)
    return True


def main():
    os.makedirs(os.path.join(RAW, "gettingreal"), exist_ok=True)
    for name, url in ESSAYS.items():
        download(url, os.path.join(RAW, name))

    index = open(os.path.join(RAW, "getting-real.html"), encoding="utf-8", errors="ignore").read()
    chapters = sorted(set(re.findall(r'href="(/gettingreal/[^"]+)"', index)))
    for path in chapters:
        download(f"https://basecamp.com{path}", os.path.join(RAW, "gettingreal", path.split("/")[-1] + ".html"))

    print(f"{len(ESSAYS)} essays and {len(chapters)} Getting Real chapters in {RAW}")


if __name__ == "__main__":
    main()
