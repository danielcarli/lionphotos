#!/usr/bin/env python3
# ---------------------------------------------------------------------------------------------
#  LionPhotos — Copyright (C) 2026 LionPhotos Team.
#  Created and conceived by Daniel Michelon De Carli.
#  Licensed under the MIT License. See LICENSE in the project root.
# ---------------------------------------------------------------------------------------------
# The countries and continents LionPhotos knows, for album names ("Itália dez-2024", "Europa jan-2025"):
#
#   src/platform/geo/common/countries.json  every country (and countries.js, the same for the window): ISO codes, continent, UN region, and the names
#                                            people write (the 10 languages of the app, the map's own
#                                            names in more, and common aliases: EUA, Holanda, Inglaterra…)
#   src/platform/geo/node/countryShapes.json their borders, simplified (0.001°), to tell the country of a
#                                            photo from its GPS position — on this computer, no service
#
# From Natural Earth (public domain), admin 0 countries at 1:50 million. Run once when updating:
#   python3 tools/geo/build.py [--source ne_50m_admin_0_countries.geojson]
import argparse, json, os, subprocess, sys, unicodedata, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
URL = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson'
LOCALES = ['en', 'pt-BR', 'pt-PT', 'es', 'fr', 'de', 'it', 'ja', 'ko', 'zh-CN']
NE_NAMES = ['NAME', 'NAME_LONG', 'NAME_EN', 'NAME_PT', 'NAME_ES', 'NAME_FR', 'NAME_DE', 'NAME_IT', 'NAME_JA', 'NAME_KO', 'NAME_ZH', 'NAME_NL', 'NAME_PL', 'NAME_SV']

# the continents as people name them in album titles (the Americas in three, as taught in Brazil)
CONTINENTS = ['africa', 'antarctica', 'asia', 'europe', 'northAmerica', 'centralAmerica', 'southAmerica', 'oceania']
# UN M49 codes of the regions (their names come from the system: Intl.DisplayNames)
SUBREGION_M49 = {
    'Northern Africa': '015', 'Eastern Africa': '014', 'Middle Africa': '017', 'Southern Africa': '018', 'Western Africa': '011',
    'Caribbean': '029', 'Central America': '013', 'South America': '005', 'Northern America': '021',
    'Central Asia': '143', 'Eastern Asia': '030', 'South-Eastern Asia': '035', 'Southern Asia': '034', 'Western Asia': '145',
    'Eastern Europe': '151', 'Northern Europe': '154', 'Southern Europe': '039', 'Western Europe': '155',
    'Australia and New Zealand': '053', 'Melanesia': '054', 'Micronesia': '057', 'Polynesia': '061',
    'Antarctica': 'AQ', 'Seven seas (open ocean)': None,
}
# map units without a code of their own, and codes Natural Earth writes as -99
FIX_A2 = {'SOL': 'SO', 'CYN': 'CY', 'KOS': 'XK', 'FRA': 'FR', 'NOR': 'NO', 'KAS': None, 'ATC': 'AU', 'IOA': 'AU', 'CNM': 'CY', 'BJN': None, 'SER': None, 'SCR': None, 'ESB': 'GB', 'WSB': 'GB', 'PSX': 'PS'}
# what people also write
ALIASES = {
    'US': ['EUA', 'USA', 'U.S.A.', 'Estados Unidos da América', 'United States of America', 'Estados Unidos de América'],
    'GB': ['UK', 'Inglaterra', 'England', 'Escócia', 'Scotland', 'País de Gales', 'Wales', 'Irlanda do Norte', 'Northern Ireland', 'Grã-Bretanha', 'Great Britain', 'Gran Bretaña', 'Angleterre', 'Écosse'],
    'NL': ['Holanda', 'Holland', 'Países Baixos', 'Hollande'],
    'CZ': ['República Tcheca', 'República Checa', 'Czech Republic', 'Tchecoslováquia'],
    'KR': ['Coreia do Sul', 'Coréia do Sul', 'South Korea', 'Corea del Sur'],
    'KP': ['Coreia do Norte', 'North Korea', 'Corea del Norte'],
    'RU': ['Rússia', 'Russia', 'Rusia'],
    'AE': ['Emirados Árabes', 'Emirados Árabes Unidos', 'UAE', 'Emiratos Árabes'],
    'VA': ['Vaticano', 'Vatican', 'Cidade do Vaticano'],
    'CD': ['Congo-Kinshasa', 'República Democrática do Congo'], 'CG': ['Congo-Brazzaville'],
    'CI': ['Costa do Marfim', 'Ivory Coast', 'Costa de Marfil'], 'MK': ['Macedônia', 'Macedonia'], 'SZ': ['Suazilândia', 'Swaziland'],
    'MM': ['Birmânia', 'Burma', 'Myanmar'], 'TL': ['Timor Leste', 'East Timor'], 'CV': ['Cabo Verde', 'Cape Verde'],
    'BA': ['Bósnia', 'Bosnia'], 'DO': ['República Dominicana', 'Dominican Republic'], 'TR': ['Turquia', 'Türkiye', 'Turkiye'],
    'IR': ['Irã', 'Irão', 'Persia'], 'BY': ['Bielorrússia', 'Belarus'], 'MD': ['Moldávia'], 'BO': ['Bolívia'],
}
# names that are also everyday words or first names: they count only written with a capital letter
WEAK = {'PE', 'TD', 'IL', 'GE', 'TR', 'CN', 'NE', 'ML', 'TG', 'JE', 'IM', 'DM', 'GN', 'JO', 'SV', 'TO', 'GA'}


def fold(s):
    return ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn').lower()


def intl_names(codes):
    script = ("const L=%s, C=%s; const out={}; for (const c of C) { out[c] = {}; for (const l of L) { try { out[c][l] = new Intl.DisplayNames([l], { type: 'region' }).of(c); } catch {} } } console.log(JSON.stringify(out));"
              % (json.dumps(LOCALES), json.dumps(codes)))
    return json.loads(subprocess.check_output(['node', '-e', script]))


def continent_of(p):
    cont, sub = p['CONTINENT'], p['SUBREGION']
    if p['ADM0_A3'] == 'MEX':
        return 'northAmerica'   # Mexico is North America in the usual split of the Americas
    if cont == 'North America':
        return 'centralAmerica' if sub in ('Central America', 'Caribbean') else 'northAmerica'
    if cont == 'Seven seas (open ocean)':
        reg = p['REGION_UN']
        return {'Africa': 'africa', 'Asia': 'asia', 'Oceania': 'oceania', 'Americas': 'southAmerica', 'Europe': 'europe'}.get(reg)
    return {'Africa': 'africa', 'Antarctica': 'antarctica', 'Asia': 'asia', 'Europe': 'europe', 'South America': 'southAmerica', 'Oceania': 'oceania'}.get(cont)


def ring(coords):
    out = []
    last = None
    for x, y in coords:
        q = (round(x * 1000), round(y * 1000))
        if q != last:
            out.extend(q)
            last = q
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--source')
    a = ap.parse_args()
    if a.source:
        data = json.load(open(a.source))
    else:
        with urllib.request.urlopen(URL) as r:
            data = json.load(r)
    countries, shapes = {}, {}
    for f in data['features']:
        p = f['properties']
        a3 = p['ADM0_A3']
        a2 = FIX_A2.get(a3, p['ISO_A2'] if p['ISO_A2'] not in ('-99', None) else p.get('ISO_A2_EH'))
        if not a2 or a2 == '-99':
            continue
        g = f['geometry']
        polys = g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]
        shapes.setdefault(a2, []).extend([[ring(r) for r in poly] for poly in polys])
        if a2 in countries:
            continue
        names = [p[k] for k in NE_NAMES if p.get(k)]
        countries[a2] = {
            'iso2': a2, 'iso3': p['ISO_A3'] if p['ISO_A3'] not in ('-99', None) else a3,
            'continent': continent_of(p), 'region': SUBREGION_M49.get(p['SUBREGION']),
            'names': names,
        }
    intl = intl_names(sorted(countries))
    for c in countries.values():
        own = intl.get(c['iso2'], {})
        c['label'] = own.get('en') or c['names'][0]
        allnames = list(own.values()) + c['names'] + ALIASES.get(c['iso2'], [])
        seen, uniq = set(), []
        for n in allnames:
            k = fold(n).strip()
            if n and k and k not in seen and k != fold(c['iso2']):
                seen.add(k)
                uniq.append(n)
        c['names'] = uniq
        if c['iso2'] in WEAK:
            c['weak'] = True
    # the continents' names in the app's languages (written here: the system has no single word for them)
    out = {
        'source': 'Natural Earth 1:50m admin 0 countries (public domain), names also from Unicode CLDR via Intl.DisplayNames',
        'continents': CONTINENTS,
        'countries': sorted(countries.values(), key=lambda c: c['iso2']),
    }
    common = os.path.join(ROOT, 'src', 'platform', 'geo', 'common')
    node = os.path.join(ROOT, 'src', 'platform', 'geo', 'node')
    os.makedirs(common, exist_ok=True)
    os.makedirs(node, exist_ok=True)
    with open(os.path.join(common, 'countries.json'), 'w') as fh:
        json.dump(out, fh, ensure_ascii=False, separators=(',', ':'))
    # the same for the window, as a module
    with open(os.path.join(common, 'countries.js'), 'w') as fh:
        fh.write('// Generated by tools/geo/build.py from Natural Earth (public domain) and Unicode CLDR: do not edit.\n')
        fh.write('export default ' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n')
    # borders: per country its polygons (outer ring, then holes), in thousandths of a degree, with a box
    shp = []
    for a2, polys in sorted(shapes.items()):
        xs = [v for poly in polys for v in poly[0][0::2]]
        ys = [v for poly in polys for v in poly[0][1::2]]
        shp.append({'iso2': a2, 'box': [min(xs), min(ys), max(xs), max(ys)], 'polys': polys})
    with open(os.path.join(node, 'countryShapes.json'), 'w') as fh:
        json.dump({'scale': 1000, 'countries': shp}, fh, separators=(',', ':'))
    print(len(countries), 'countries;', os.path.getsize(os.path.join(common, 'countries.json')) // 1024, 'KB names;',
          os.path.getsize(os.path.join(node, 'countryShapes.json')) // 1024, 'KB borders')


if __name__ == '__main__':
    sys.exit(main())
