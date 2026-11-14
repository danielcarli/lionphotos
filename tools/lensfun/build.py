#!/usr/bin/env python3
# ---------------------------------------------------------------------------------------------
#  LionPhotos — Copyright (C) 2026 LionPhotos Team.
#  Created and conceived by Daniel Michelon De Carli.
#  Licensed under the MIT License. See LICENSE in the project root.
# ---------------------------------------------------------------------------------------------
# The lens corrections LionPhotos knows: the whole Lensfun database (lenses and cameras), made compact for the
# window — src/workbench/services/adjust/common/lensfun.json, read only when a photo's lens is corrected.
#
# Lensfun's data is © the Lensfun contributors, under CC BY-SA 3.0 (https://lensfun.github.io); the file made
# here is under the same licence (its LICENSE note goes beside it). Only the data is used — none of Lensfun's
# code. Run once when updating, from a copy of the Lensfun repository:
#   git clone --depth 1 https://github.com/lensfun/lensfun.git /tmp/lensfun
#   python3 tools/lensfun/build.py /tmp/lensfun
#
# The file: { "about": {...}, "cameras": [[maker, model, crop], …], "lenses": [{ m, n, mt, c, a?, t?, d?, ca?, v? }, …] }
#   m maker · n model · mt mounts · c crop factor of the calibration · a its aspect ratio (when not 3:2) · t the
#   projection when not rectilinear (fisheye, equisolid…)
#   d  distortion  [focal, "p", a, b, c] (ptlens) · [focal, "3", k1] (poly3) · [focal, "5", k1, k2] (poly5)
#   ca chromatic aberration [focal, "l", kr, kb] (linear) · [focal, "3", vr, vb, cr, cb, br, bb] (poly3)
#   v  vignetting [focal, aperture, distance, k1, k2, k3] (pa)
import glob, json, os, subprocess, sys, xml.etree.ElementTree as ET

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, 'src', 'workbench', 'services', 'adjust', 'common', 'lensfun.json')


def num(x, digits=6):
    v = float(x)
    r = float(f'{v:.{digits}g}')
    return int(r) if r == int(r) and abs(r) < 1e6 else r


def text(el, tag):
    # the name without a language (Lensfun also has translated names)
    for x in el.findall(tag):
        if 'lang' not in x.attrib and x.text:
            return ' '.join(x.text.split())
    return None


def main(src):
    db = os.path.join(src, 'data', 'db')
    files = sorted(glob.glob(os.path.join(db, '*.xml')))
    if not files:
        sys.exit(f'no Lensfun database in {db}')
    lenses, cameras, seen_cam = [], [], set()
    for f in files:
        root = ET.parse(f).getroot()
        for c in root.iter('camera'):
            maker, model = text(c, 'maker'), text(c, 'model')
            crop = c.findtext('cropfactor')
            if not maker or not model or not crop:
                continue
            variant = text(c, 'variant')
            key = (maker, model, variant)
            if key in seen_cam:
                continue
            seen_cam.add(key)
            cameras.append([maker, model, num(crop, 4)] + ([variant] if variant else []))
        for l in root.iter('lens'):
            maker, model = text(l, 'maker'), text(l, 'model')
            if not maker or not model:
                continue
            o = {'m': maker, 'n': model, 'mt': [m.text for m in l.findall('mount') if m.text], 'c': num(l.findtext('cropfactor') or 1, 4)}
            ar = l.findtext('aspect-ratio')
            if ar:
                a = num(float(ar.split(':')[0]) / float(ar.split(':')[1]) if ':' in ar else ar, 5)
                if abs(a - 1.5) > 1e-3:
                    o['a'] = a
            ty = l.findtext('type')
            if ty and ty != 'rectilinear':
                o['t'] = ty
            d, ca, v = [], [], []
            for cal in l.findall('calibration'):
                for x in cal:
                    a = x.attrib
                    md = a.get('model')
                    try:
                        if x.tag == 'distortion':
                            f0 = num(a['focal'], 5)
                            if md == 'ptlens':
                                d.append([f0, 'p', num(a.get('a', 0)), num(a.get('b', 0)), num(a.get('c', 0))])
                            elif md == 'poly3':
                                d.append([f0, '3', num(a.get('k1', 0))])
                            elif md == 'poly5':
                                d.append([f0, '5', num(a.get('k1', 0)), num(a.get('k2', 0))])
                        elif x.tag == 'tca':
                            f0 = num(a['focal'], 5)
                            if md == 'linear':
                                ca.append([f0, 'l', num(a.get('kr', 1)), num(a.get('kb', 1))])
                            elif md == 'poly3':
                                ca.append([f0, '3'] + [num(a.get(k, 1 if k[0] == 'v' else 0)) for k in ('vr', 'vb', 'cr', 'cb', 'br', 'bb')])
                        elif x.tag == 'vignetting' and md == 'pa':
                            row = [num(a['focal'], 5), num(a['aperture'], 4), num(a.get('distance', 1000), 5)] + [num(a.get(k, 0), 5) for k in ('k1', 'k2', 'k3')]
                            # the same at another distance: kept once (at the farthest)
                            same = next((r for r in v if r[0] == row[0] and r[1] == row[1] and r[3:] == row[3:]), None)
                            if same:
                                same[2] = max(same[2], row[2])
                            else:
                                v.append(row)
                    except (KeyError, ValueError):
                        continue
            if d: o['d'] = sorted(d, key=lambda r: r[0])
            if ca: o['ca'] = sorted(ca, key=lambda r: r[0])
            if v: o['v'] = v
            if not (d or ca or v):
                continue
            lenses.append(o)
    lenses.sort(key=lambda o: (o['m'].lower(), o['n'].lower()))
    cameras.sort(key=lambda c: (c[0].lower(), c[1].lower()))
    try:
        rev = subprocess.run(['git', '-C', src, 'log', '-1', '--format=%h %cs'], capture_output=True, text=True).stdout.strip()
    except OSError:
        rev = ''
    about = {'source': 'Lensfun lens database — https://lensfun.github.io', 'revision': rev,
             'license': 'CC BY-SA 3.0 — https://creativecommons.org/licenses/by-sa/3.0/',
             'copyright': '© the Lensfun contributors', 'lenses': len(lenses), 'cameras': len(cameras)}
    with open(OUT, 'w', encoding='utf-8') as fh:
        json.dump({'about': about, 'cameras': cameras, 'lenses': lenses}, fh, ensure_ascii=False, separators=(',', ':'))
    print(f'{OUT}: {len(lenses)} lenses, {len(cameras)} cameras, {os.path.getsize(OUT) // 1024} KB ({rev})')


if __name__ == '__main__':
    if len(sys.argv) < 2:
        sys.exit(__doc__ or 'usage: build.py <lensfun checkout>')
    main(sys.argv[1])
