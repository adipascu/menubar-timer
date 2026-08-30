#!/usr/bin/env python3
import glob
import html
import json
import os
import re

REPO = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(REPO, "raw")
TEXT = os.path.join(REPO, "text")


def to_text(markup):
    markup = re.sub(r"(?is)<(script|style|head|nav|footer)[^>]*>.*?</\1>", " ", markup)
    markup = re.sub(r"(?i)<br\s*/?>|</p>|</div>|</tr>|</h\d>|</li>", "\n", markup)
    markup = re.sub(r"<[^>]+>", " ", markup)
    markup = html.unescape(markup)
    markup = re.sub(r"[ \t\xa0]+", " ", markup)
    return re.sub(r"\n\s*\n+", "\n\n", markup).strip()


def extract_essays():
    for path in glob.glob(os.path.join(RAW, "*.html")):
        name = os.path.basename(path)[:-5]
        if name == "getting-real":
            continue
        with open(path, encoding="utf-8", errors="ignore") as handle:
            open(os.path.join(TEXT, name + ".txt"), "w").write(to_text(handle.read()))


def extract_getting_real():
    os.makedirs(os.path.join(TEXT, "gettingreal"), exist_ok=True)
    index = []
    for path in sorted(glob.glob(os.path.join(RAW, "gettingreal", "*.html"))):
        slug = os.path.basename(path)[:-5]
        title = re.sub(r"^\d+\.\d+-", "", slug).replace("-", " ").title()
        with open(path, encoding="utf-8", errors="ignore") as handle:
            body = to_text(handle.read())
        marker = re.search(r'data-bookmark-id="/gettingreal">', body)
        if marker:
            body = body[marker.end():]
        body = re.sub(r"(?s)\n\s*(Next:|Previous:|Get Real|Buy the paperback).*$", "", body).strip()
        tagline = body.split("\n")[0].strip()
        open(os.path.join(TEXT, "gettingreal", slug + ".txt"), "w").write(f"{title}\n{tagline}\n\n{body}")
        index.append({"slug": slug, "title": title, "tagline": tagline})
    json.dump(index, open(os.path.join(TEXT, "gettingreal-index.json"), "w"), indent=1)
    return len(index)


if __name__ == "__main__":
    os.makedirs(TEXT, exist_ok=True)
    extract_essays()
    print(f"{extract_getting_real()} Getting Real chapters extracted")
