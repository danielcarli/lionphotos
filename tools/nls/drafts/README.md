# Draft catalogs (not shipped yet)

First drafts of Português (Portugal), Español, Français and Deutsch, written before the 1.0 scope was
fixed to English and Português (Brasil). They miss the messages added later (labels, list columns,
file kinds). To ship one: complete it against `../en.py`, move it up one folder, add its id to
`LOCALES` in `../build.py` and to `src/nls/locales.json`, then run `python3 tools/nls/build.py`.
Italiano, 简体中文, 日本語 and 한국어 follow the same path (LionOrganizer's catalogs are a good
terminology reference).
