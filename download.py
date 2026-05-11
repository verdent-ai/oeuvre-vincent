#!/usr/bin/env python3
"""Download Van Gogh paintings from Wikimedia Commons via the thumbnail API."""
import urllib.request
import urllib.parse
import json
import os
import time
import hashlib

OUT = os.path.join(os.path.dirname(__file__), "images", "raw")
os.makedirs(OUT, exist_ok=True)

UA = "VanGoghScrollLearningProject/1.0 (saderia_simants163@mail.com) Python-urllib"

# Map output filename -> Commons File: title (without "File:" prefix)
PAINTINGS = {
    "01_potato_eaters.jpg":          "Vincent_van_Gogh_-_The_potato_eaters_-_Google_Art_Project_(5776925).jpg",
    "02_self_portrait_straw_hat.jpg":"Vincent_van_Gogh_-_Self-portrait_with_straw_hat_-_Google_Art_Project.jpg",
    "03_yellow_house.jpg":           "Vincent_van_Gogh_-_The_yellow_house_('The_street').jpg",
    "04_bedroom_arles.jpg":          "Vincent_van_Gogh_-_De_slaapkamer_-_Google_Art_Project.jpg",
    "05_cafe_terrace.jpg":           "Van_Gogh_-_Terrasse_des_Cafés_an_der_Place_du_Forum_in_Arles_am_Abend1.jpeg",
    "06_sunflowers.jpg":             "Vincent_van_Gogh_-_Sunflowers_-_VGM_F458.jpg",
    "07_bandaged_ear.jpg":           "Vincent_van_Gogh_-_Self_portrait_with_bandaged_ear_F529.jpg",
    "08_starry_night.jpg":           "Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg",
    "09_almond_blossoms.jpg":        "Vincent_van_Gogh_-_Almond_blossom_-_Google_Art_Project.jpg",
    "10_wheatfield_crows.jpg":       "Vincent_van_Gogh_(1853-1890)_-_Wheat_Field_with_Crows_(1890).jpg",
    "portrait_van_gogh.jpg":         "Vincent_van_Gogh_-_Self-portrait_with_grey_felt_hat_-_Google_Art_Project.jpg",
}

API = "https://commons.wikimedia.org/w/api.php"

def query_image_url(title, width=2400):
    """Use MediaWiki API to resolve a File: title to a thumbnail URL of given width."""
    params = {
        "action": "query",
        "format": "json",
        "titles": "File:" + title,
        "prop": "imageinfo",
        "iiprop": "url|size",
        "iiurlwidth": str(width),
    }
    url = API + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        data = json.load(r)
    pages = data.get("query", {}).get("pages", {})
    for _, page in pages.items():
        if "missing" in page:
            return None
        info = page.get("imageinfo", [])
        if info:
            return info[0].get("thumburl") or info[0].get("url")
    return None

def fetch(name, title):
    out = os.path.join(OUT, name)
    if os.path.exists(out) and os.path.getsize(out) > 50000:
        return f"SKIP {name} ({os.path.getsize(out)} bytes)"
    try:
        url = query_image_url(title)
        if not url:
            return f"MISS {name}: title not found '{title}'"
        time.sleep(0.5)
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=120) as r:
            data = r.read()
        with open(out, "wb") as f:
            f.write(data)
        return f"OK   {name}  <-  {url.rsplit('/',1)[-1]}  ({len(data)} bytes)"
    except Exception as e:
        return f"FAIL {name}: {e}"

if __name__ == "__main__":
    for name, title in PAINTINGS.items():
        print(fetch(name, title))
        time.sleep(1.0)
