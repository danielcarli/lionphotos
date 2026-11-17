# Builds src/nls/<locale>.json from tools/nls/<locale>.py (nested dicts, P(one, other) for plurals).
# Languages without plural forms (zh-CN, ja, ko) may give a plain string where English has P(...).
# Missing messages fall back to English at run time; this script lists them.
import importlib, json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', '..', 'src', 'nls')
sys.path.insert(0, HERE)
LOCALES = ['en', 'pt-BR', 'pt-PT', 'es', 'fr', 'de', 'it', 'zh-CN', 'ja', 'ko']
RULES = {'zero', 'one', 'two', 'few', 'many', 'other'}

def flatten(d, prefix=''):
    out = {}
    for k, v in d.items():
        key = f'{prefix}.{k}' if prefix and k else (prefix or k)
        if isinstance(v, dict) and v and set(v) <= RULES:
            for r, s in v.items(): out[f'{key}.{r}'] = s
        elif isinstance(v, dict):
            out.update(flatten(v, key))
        else:
            out[key] = v
    return out

# the names of the content categories, one table for every language (content_categories.tsv)
def categories():
    rows = [l.rstrip('\n').split('\t') for l in open(os.path.join(HERE, 'content_categories.tsv'), encoding='utf-8') if l.strip() and not l.startswith('#')]
    head, rows = rows[0], rows[1:]
    return {loc: {f'content.cat.{r[0]}': r[head.index(loc.replace('-', '_'))] for r in rows} for loc in LOCALES}
CATS = categories()

en = flatten(importlib.import_module('en').MESSAGES) | CATS['en']
for loc in LOCALES:
    msgs = flatten(importlib.import_module(loc.replace('-', '_')).MESSAGES) | CATS[loc]
    out, missing = {}, []
    for key in en:
        if key in msgs: out[key] = msgs[key]
        elif key.rsplit('.', 1)[-1] in RULES and key.rsplit('.', 1)[0] in msgs: out[key] = msgs[key.rsplit('.', 1)[0]]
        else: missing.append(key)
    extra = [k for k in msgs if k not in out and not (k + '.other') in en]
    with open(os.path.join(OUT, f'{loc}.json'), 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=2); f.write('\n')
    print(f'{loc:6} {len(out)} messages' + (f' · missing {len(missing)}: {missing[:6]}' if missing else '') + (f' · unknown {extra[:6]}' if extra else ''))
