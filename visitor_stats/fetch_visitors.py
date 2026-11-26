#!/usr/bin/env python3
"""Fetch cumulative visitor stats from the public mapmyvisitors page and write _data/visitors.json.

Run daily by .github/workflows/update_visitor_stats.yml. Standard library only.
Usage: python3 visitor_stats/fetch_visitors.py [html_file]   (html_file is for offline testing)
"""
import datetime, html, json, re, sys, urllib.request
from pathlib import Path

URL = "https://mapmyvisitors.com/web/1c1nu"
OUT = Path(__file__).resolve().parent.parent / "_data" / "visitors.json"


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (homepage visitor stats)"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read().decode("utf-8", "replace")


def flag(code):
    """ISO alpha-2 -> emoji flag (regional indicator pair)."""
    return "".join(chr(0x1F1E6 + ord(ch) - ord("A")) for ch in code.upper()) if re.fullmatch(r"[A-Za-z]{2}", code) else ""


def num(s):
    return int(re.sub(r"[^0-9]", "", s) or 0)


def parse(page):
    m = re.search(r'class="[^"]*total-pageviews[^"]*"[^>]*data-value="(\d+)"', page)
    if not m:
        raise SystemExit("total-pageviews not found; page layout changed?")
    total = int(m.group(1))
    since = re.search(r'pvTT">\s*Since ([^<]+?)\s*<', page)
    countries = []
    # one row per country: flag + name | Locations (link "N Locations", plain "N Locations", or empty = 1) | Visits | Uniques
    row = re.compile(
        r'<span class="flag (\w{2})"[^>]*></span>\s*<span class="vstor">([^<]+)</span>\s*</td>\s*'
        r'<td>(.*?)</td>\s*<td>\s*([\d,]+)\s*</td>\s*<td>\s*([\d,]+)\s*</td>',
        re.S)
    for code, name, loc_cell, visits, uniq in row.findall(page):
        locs = re.search(r"(\d+)\s+Locations?", loc_cell)
        countries.append({"code": code.upper(), "flag": flag(code), "name": html.unescape(name).strip(),
                          "locations": int(locs.group(1)) if locs else 1,
                          "visits": num(visits), "uniques": num(uniq)})
    countries.sort(key=lambda c: -c["visits"])
    return {
        "total_pageviews": total,
        "total_display": f"{total:,}",
        "since": since.group(1).strip() if since else None,
        "countries": len(countries),
        "locations": sum(c["locations"] for c in countries),
        "uniques": sum(c["uniques"] for c in countries),
        "top": countries[:8],
        "updated": datetime.date.today().isoformat(),
    }


def main():
    page = Path(sys.argv[1]).read_text() if len(sys.argv) > 1 else fetch(URL)
    data = parse(page)
    if data["countries"] == 0:
        raise SystemExit("no country rows parsed; page layout changed?")
    OUT.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
    print(json.dumps({k: v for k, v in data.items() if k != "top"}))


if __name__ == "__main__":
    main()
