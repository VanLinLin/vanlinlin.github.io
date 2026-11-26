#!/usr/bin/env python3
"""One-off: shrink Natural Earth 110m countries (public domain) into assets/data/countries-110m.json
for the visitor globe. Keeps ISO alpha-2 code, name, rounded geometry and a label point.

Source: https://raw.githubusercontent.com/vasturiano/globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson
Usage: python3 visitor_stats/build_countries.py ne_110m_admin_0_countries.geojson
"""
import json, sys
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "assets" / "data" / "countries-110m.json"
# Natural Earth leaves ISO_A2 = -99 for a few admin units
FIX = {"France": "FR", "Norway": "NO", "Kosovo": "XK", "Somaliland": "-99", "N. Cyprus": "-99"}
# countries too small for the 110m layer: label point only
EXTRA = [("HK", "Hong Kong", 22.32, 114.17), ("SG", "Singapore", 1.35, 103.82), ("BH", "Bahrain", 26.07, 50.55),
         ("MO", "Macao", 22.20, 113.55), ("MT", "Malta", 35.90, 14.45), ("LU", "Luxembourg", 49.81, 6.13),
         ("MV", "Maldives", 3.20, 73.22), ("MU", "Mauritius", -20.25, 57.55), ("QA", "Qatar", 25.35, 51.18)]


def ring_area_centroid(ring):
    a = cx = cy = 0.0
    for (x0, y0), (x1, y1) in zip(ring, ring[1:] + ring[:1]):
        f = x0 * y1 - x1 * y0
        a += f; cx += (x0 + x1) * f; cy += (y0 + y1) * f
    if abs(a) < 1e-12:
        return 0.0, ring[0][0], ring[0][1]
    return abs(a / 2), cx / (3 * a), cy / (3 * a)


def rnd(c):
    """Round to 3 decimals (~100 m) and drop repeated vertices; coarser rounding
    produced degenerate rings that make h3 (globe.gl hex layer) throw."""
    out = []
    for x, y in c:
        q = [round(x, 3), round(y, 3)]
        if not out or q != out[-1]:
            out.append(q)
    if out[0] != out[-1]:
        out.append(out[0])
    return out


def clean(polys):
    """Rounded polygons; drop islets that collapse below a valid ring (4 points)."""
    out = []
    for poly in polys:
        rings = [rnd(r) for r in poly]
        if len(rings[0]) < 4:
            continue
        out.append([r for r in rings if len(r) >= 4])
    return out


def main(src):
    d = json.loads(Path(src).read_text())
    feats = []
    for f in d["features"]:
        p, g = f["properties"], f["geometry"]
        code = p["ISO_A2"] if p["ISO_A2"] != "-99" else FIX.get(p["NAME"], p.get("ISO_A2_EH", "-99"))
        polys = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
        area, lng, lat = max(ring_area_centroid(poly[0]) for poly in polys)
        feats.append({"type": "Feature",
                      "properties": {"c": code, "n": p["NAME"], "lat": round(lat, 2), "lng": round(lng, 2)},
                      "geometry": {"type": "MultiPolygon", "coordinates": clean(polys)}})
    have = {f["properties"]["c"] for f in feats}
    extra = [{"c": c, "n": n, "lat": la, "lng": lo} for c, n, la, lo in EXTRA if c not in have]
    OUT.write_text(json.dumps({"features": feats, "extra": extra}, separators=(",", ":")))
    print(OUT, OUT.stat().st_size, "bytes,", len(feats), "polygons,", len(extra), "points")


if __name__ == "__main__":
    main(sys.argv[1])
