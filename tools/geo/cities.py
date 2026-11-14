#!/usr/bin/env python3
# ---------------------------------------------------------------------------------------------
#  LionPhotos — Copyright (C) 2026 LionPhotos Team.
#  Created and conceived by Daniel Michelon De Carli.
#  Licensed under the MIT License. See LICENSE in the project root.
# ---------------------------------------------------------------------------------------------
# The cities LionPhotos knows, to name the place of a photo from its GPS position — on this computer, no
# service is asked (Places: "Jaguariúna · São Paulo · Brasil"):
#
#   src/platform/geo/node/cities.json  every city of 15 000 people or more: its name, country, state, position,
#                                      people (thousands)
#
# From GeoNames (CC BY 4.0, https://www.geonames.org): cities15000.zip and admin1CodesASCII.txt. Run once when
# updating:  python3 tools/geo/cities.py [--cities cities15000.zip] [--admin1 admin1CodesASCII.txt]
import argparse, io, json, os, sys, urllib.request, zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
BASE = 'https://download.geonames.org/export/dump/'


def fetch(name, given):
    if given:
        return open(given, 'rb').read()
    with urllib.request.urlopen(BASE + name) as r:
        return r.read()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--cities')
    ap.add_argument('--admin1')
    a = ap.parse_args()
    admin1 = {}
    for line in fetch('admin1CodesASCII.txt', a.admin1).decode('utf-8').splitlines():
        p = line.split('\t')
        if len(p) >= 2:
            admin1[p[0]] = p[1]
    z = zipfile.ZipFile(io.BytesIO(fetch('cities15000.zip', a.cities)))
    text = z.read('cities15000.txt').decode('utf-8')
    states, cities = [], []
    index = {}
    for line in text.splitlines():
        p = line.split('\t')
        if len(p) < 15:
            continue
        name, lat, lon, cc, a1, pop = p[1], float(p[4]), float(p[5]), p[8], p[10], int(p[14] or 0)
        # towns and cities, not the sections of one (a district of Rome is Rome), nor abandoned or historical places
        if p[7] in ('PPLX', 'PPLH', 'PPLQ', 'PPLW', 'PPLCH'):
            continue
        state = admin1.get(f'{cc}.{a1}', '')
        # the states are written once, cities point to them
        if state not in index:
            index[state] = len(states)
            states.append(state)
        row = [name, cc, index[state], round(lat * 1000), round(lon * 1000), round(pop / 1000)]
        # the names a big city is also written with, in Latin letters ("Roma", "Rom", "Rzym"…): a place written
        # in another language is found on the map
        if pop >= 100000:
            alts = []
            for a in p[3].split(','):
                a = a.strip()
                if a and a != name and len(a) <= 30 and all(ord(ch) < 0x250 for ch in a) and not any(ch.isdigit() for ch in a) and a not in alts:
                    alts.append(a)
            if alts:
                row.append(alts[:30] if pop >= 500000 else alts[:8])
        cities.append(row)
    cities.sort(key=lambda c: (c[3], c[4]))
    out = os.path.join(ROOT, 'src', 'platform', 'geo', 'node', 'cities.json')
    with open(out, 'w', encoding='utf-8') as fh:
        json.dump({'source': 'GeoNames cities15000 and admin1 codes (CC BY 4.0, www.geonames.org)', 'scale': 1000, 'states': states, 'cities': cities},
                  fh, ensure_ascii=False, separators=(',', ':'))
    print(len(cities), 'cities;', len(states), 'states;', os.path.getsize(out) // 1024, 'KB')


if __name__ == '__main__':
    sys.exit(main())
