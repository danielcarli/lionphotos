/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// "Reorganize the collection": the proposal for a collection like a real one — years, events loose at the
// top, a month folder of loose photos, a long theme, tests of gear, things to sort, a Videos folder.
// Run: node tools/test-reorganize.js
'use strict';
const { proposeReorganization, cleanName } = require('../src/platform/operations/node/reorganize');

let failures = 0;
const check = (ok, label, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? '  ' + extra : ''}`); if (!ok) failures++; };

// names
const names = [['Natal 2025', 'Natal'], ['UFSM-Final de 2025', 'UFSM-Final'], ['2024 - Itália', 'Itália'], ['FOtos Noah', 'Fotos-Noah'],
  ['CEC - Visita', 'CEC-Visita'], ['Visita Ministro Camilo', 'Visita-Ministro-Camilo'], ['2025-07-14 Festa', 'Festa'], ['1 ano Noah', '1-ano-Noah'],
  ['UFSM e nevoa', 'UFSM-e-nevoa'], ['Fotos: "teste" <1>', 'Fotos-teste-1'], ['2025', '']];
for (const [a, b] of names) check(cleanName(a) === b, `name "${a}" → "${b}"`, cleanName(a));

let id = 0;
const at = (y, m, d, h = 12) => new Date(y, m - 1, d, h).getTime();
const photos = (dir, n, start, stepHours = 1, extra = {}) => Array.from({ length: n }, (_, i) => ({ id: ++id, rel: `${dir}/IMG_${id}.JPG`, kind: 1, taken: start + i * stepHours * 3600000, mtime: start, ...extra }));
const items = [
  ...photos('2024 - Itália', 60, at(2024, 7, 2), 6), // 15 days
  ...photos('2024 - Itália/Roma', 10, at(2024, 7, 5)),
  ...photos('2025/Natal 2025', 30, at(2025, 12, 24, 18), 0.2, { sphere: 'personal' }),
  ...photos('2025/Natal 2025/Raw', 10, at(2025, 12, 24, 18)),
  ...photos('2025/2025-12', 8, at(2025, 12, 5, 9), 1), // loose, one day
  ...photos('2025/2025-12', 5, at(2025, 12, 19, 9), 1), // loose, another day
  ...photos('2025/FOtos Noah', 40, at(2025, 2, 1), 24 * 6), // 8 months
  ...photos('2025/Pauta Sitio Arqueologico', 25, at(2025, 8, 21, 8), 0.5, { sphere: 'professional' }),
  ...photos('2025/2025-03-02-Formatura', 12, at(2025, 3, 2, 19), 0.5), // already organized
  ...photos('CEC - Visita', 20, at(2025, 5, 10, 14), 0.2, { sphere: 'professional' }),
  ...photos('UFSM-Final de 2025', 15, at(2025, 12, 12, 10), 0.3),
  ...photos('r50v', 6, at(2025, 4, 1)),
  ...photos('tete lente 24-240', 9, at(2025, 4, 3)),
  ...photos('Organizar - Africa', 14, at(2024, 11, 2), 24),
  ...photos('Documentos Recebidos', 2, at(2025, 1, 5)),
  ...photos('Temas/Viagens antigas', 5, at(2019, 1, 1), 24 * 60), // chosen before: stays
  { id: ++id, rel: 'Videos/Finalizados/cec.mp4', kind: 2, taken: at(2025, 5, 10, 16), mtime: 0 },
  { id: ++id, rel: 'Videos/Finalizados/solto.mp4', kind: 2, taken: at(2023, 1, 1), mtime: 0 },
  // a camera with its clock reset: two photos in 2000 do not stretch the event
  ...photos('Casamento Ana', 40, at(2025, 9, 6, 15), 0.2), { id: ++id, rel: 'Casamento Ana/IMG_x.JPG', kind: 1, taken: at(2000, 1, 1), mtime: 0 },
];
const folders = { 'Documentos Recebidos': { other: 30 } };
const r = proposeReorganization({ items, folders, dirs: ['2025/2025-05-10-CEC-Visita'] });
const g = (src) => r.groups.find((x) => x.src === src);
const dest = (src) => g(src)?.dest;

check(g('2024 - Itália')?.kind === 'event' && dest('2024 - Itália') === '2024/2024-07-02-Itália' && !g('2024 - Itália/Roma'), 'a 15-day trip is one event, its subfolders inside it', dest('2024 - Itália'));
check(dest('2025/Natal 2025') === '2025/2025-12-24-Natal' && !g('2025/Natal 2025/Raw'), 'an event inside its year: date first, the year out of the name; Raw/ goes along', dest('2025/Natal 2025'));
check(g('2025/FOtos Noah')?.kind === 'theme' && dest('2025/FOtos Noah') === 'Temas/Fotos-Noah', 'months of the same subject: a theme, letter case fixed', dest('2025/FOtos Noah'));
check(g('2025/2025-03-02-Formatura')?.kind === 'keep', 'already "year/yyyy-mm-dd-name": stays');
check(dest('CEC - Visita') === '2025/2025-05-10-CEC-Visita-2', 'an event loose at the top goes to its year; a name taken gets -2', dest('CEC - Visita'));
check(dest('UFSM-Final de 2025') === '2025/2025-12-12-UFSM-Final', '"UFSM-Final de 2025" → "2025-12-12-UFSM-Final"', dest('UFSM-Final de 2025'));
check(g('r50v')?.kind === 'gear' && dest('r50v') === '_Equipamento/r50v' && dest('tete lente 24-240') === '_Equipamento/tete-lente-24-240', 'camera and lens tests: _Equipamento');
check(g('Organizar - Africa')?.kind === 'inbox' && dest('Organizar - Africa') === '_Entrada/Organizar-Africa', 'waiting to be sorted: _Entrada');
check(g('Documentos Recebidos')?.kind === 'keep' && g('Documentos Recebidos').reason === 'documents', 'a folder mostly of documents is not moved');
check(g('Temas/Viagens antigas')?.kind === 'keep', 'what is already in Temas/ stays (chosen before)');
const loose = r.groups.filter((x) => x.kind === 'loose' && x.from === '2025/2025-12');
check(loose.length === 2 && loose[0].dest === '2025/2025-12-05' && loose[0].count === 8 && loose[1].dest === '2025/2025-12-19', 'loose photos of a month folder: grouped by day', loose.map((x) => `${x.dest}:${x.count}`).join(' '));
const vid = r.groups.find((x) => x.kind === 'typed');
check(vid && vid.dest === '2025/2025-05-10-CEC-Visita-2/Videos/Finalizados' && vid.count === 1, 'a video in Videos/ goes to the event of its date', vid?.dest);
const lone = r.groups.find((x) => x.kind === 'loose' && x.from === 'Videos');
check(lone && lone.dest === '2023/2023-01-01', 'a video with no event of its date: a folder of its day', lone?.dest);
check(dest('Casamento Ana') === '2025/2025-09-06-Casamento-Ana' && g('Casamento Ana').days === 0, 'a wrong clock (year 2000) does not change the date or stretch the event', `${dest('Casamento Ana')} ${g('Casamento Ana').days}`);
check(dest('2025/Pauta Sitio Arqueologico') === '2025/2025-08-21-Pauta-Sitio-Arqueologico' && g('2025/Pauta Sitio Arqueologico').sphere.main === 'professional', 'the category of the event is known');

// a subject folder made of events: it stays, its events get their dates inside it
{
  const v = proposeReorganization({ items: [...photos('Viagens/Chile 2024', 20, at(2024, 3, 10), 5), ...photos('Viagens/Gramado 2023', 10, at(2023, 7, 1), 3), ...photos('Viagens', 2, at(2023, 7, 1))] });
  const gv = (src) => v.groups.find((x) => x.src === src);
  check(gv('Viagens')?.reason === 'subject' && gv('Viagens').kind === 'keep' && gv('Viagens/Chile 2024')?.dest === 'Viagens/2024-03-10-Chile' && gv('Viagens/Gramado 2023')?.dest === 'Viagens/2023-07-01-Gramado'
    && !v.groups.some((x) => x.kind === 'loose'), 'a subject folder of events stays; its events get their dates inside it', v.groups.map((x) => `${x.src || x.from}→${x.dest}`).join(', '));
  const one = proposeReorganization({ items: [...photos('Pauta', 10, at(2025, 8, 21, 8)), ...photos('Pauta/Dia 2', 10, at(2025, 8, 22, 8)), ...photos('Pauta/Dia 1', 10, at(2025, 8, 21, 8))] });
  check(one.groups.find((x) => x.src === 'Pauta')?.dest === '2025/2025-08-21-Pauta' && one.groups.length === 1, 'an event with a folder per day stays one event (moved whole)');
}

// what an earlier "Organize by month with Raw/ and Img/" left: by day, Raw/ and Img/ kept; a camera folder inside an event is part of it
{
  const m = proposeReorganization({ items: [...photos('2025/2025-06/Img', 4, at(2025, 6, 3, 9)), ...photos('2025/2025-06/Raw', 4, at(2025, 6, 3, 9), 1, { rel: undefined }).map((x) => ({ ...x, rel: `2025/2025-06/Raw/IMG_${x.id}.CR3` })),
    ...photos('2025/2025-06/Img', 3, at(2025, 6, 20, 9)),
    ...photos('Documentario/R50V', 10, at(2026, 1, 5), 24 * 9), ...photos('Documentario/r6markII', 10, at(2026, 1, 6), 24 * 9), ...photos('Documentario/VIDEO CEC', 3, at(2026, 2, 1))] });
  const days = m.groups.filter((x) => x.from === '2025/2025-06');
  check(days.length === 2 && days[0].dest === '2025/2025-06-03' && days[0].count === 8 && days[0].subs.filter((x) => x === 'Raw').length === 4 && days[0].subs.filter((x) => x === 'Img').length === 4,
    'a month folder with Raw/ and Img/: by day, each file keeping its Raw/ or Img/', days.map((x) => `${x.dest}:${x.count}:${[...new Set(x.subs)]}`).join(' '));
  const doc = m.groups.find((x) => x.src === 'Documentario');
  check(doc && doc.kind === 'theme' && !m.groups.some((x) => /R50V|r6markII/.test(x.src || '')), 'folders named after cameras inside a folder are parts of it, not events', m.groups.map((x) => `${x.kind}:${x.src || x.from}`).join(', '));
}

// options
const s = proposeReorganization({ items, folders }, { spheres: true, themes: 'year', loose: 'inbox', names: { themes: 'Themes' } });
const gs = (src) => s.groups.find((x) => x.src === src);
check(gs('2025/Pauta Sitio Arqueologico').dest === 'Profissional/2025/2025-08-21-Pauta-Sitio-Arqueologico' && gs('2025/Natal 2025').dest === 'Pessoal/2025/2025-12-24-Natal'
  && gs('2024 - Itália').dest === '2024/2024-07-02-Itália', 'personal / professional at the top (those with no category stay out of both)');
check(gs('2025/FOtos Noah').dest === '2025/Fotos-Noah', 'themes in the year they start');
check(s.groups.filter((x) => x.from === '2025/2025-12').length === 1 && s.groups.find((x) => x.from === '2025/2025-12').dest === '_Entrada/Soltas', 'loose photos to _Entrada', s.groups.find((x) => x.from === '2025/2025-12')?.dest);

// applied, the proposal of the result changes nothing (the structure is stable)
const moved = items.map((it) => {
  const grp = r.groups.find((x) => (x.whole && (it.rel.startsWith(x.src + '/'))) || (x.ids || []).includes(it.id));
  if (!grp || grp.kind === 'keep') return it;
  const sub = grp.subs ? grp.subs[grp.ids.indexOf(it.id)] : '';
  const rel = grp.whole ? grp.dest + it.rel.slice(grp.src.length) : `${grp.dest}${sub ? '/' + sub : ''}/${it.rel.split('/').pop()}`;
  return { ...it, rel };
});
const again = proposeReorganization({ items: moved, folders: { [dest('Documentos Recebidos') || 'Documentos Recebidos']: { other: 30 } } });
const still = again.groups.filter((x) => x.kind !== 'keep');
check(!still.length, 'a second run proposes nothing (stable)', still.map((x) => `${x.src || x.from}→${x.dest}`).join(', '));
check(r.stats.moveFolders > 5 && r.stats.keep >= 3, 'stats', JSON.stringify(r.stats));

// a folder of copies: named as a backup, or holding photos that are also elsewhere — it stays (Repeated files deals with it)
{
  const T = Date.UTC(2019, 11, 15, 10), day = 864e5;
  const mk = (id, rel, t) => ({ id, rel, kind: 1, taken: t, mtime: t });
  const its = [
    ...[0, 1, 2, 3, 4, 5].map((i) => mk(100 + i, `2019/Rome/IMG_${i}.jpg`, T + i * 40 * day)),
    mk(200, 'Backup antigo/IMG_0.jpg', T), mk(201, 'Backup antigo/IMG_77.jpg', T + 900 * day),
    ...[0, 1, 2, 3, 4].map((i) => mk(300 + i, `Rome (2)/IMG_${i}.jpg`, T + i * 40 * day)),
  ];
  const p = proposeReorganization({ items: its });
  const of = (src) => p.groups.find((x) => x.src === src);
  check(of('Backup antigo')?.kind === 'keep' && of('Backup antigo').reason === 'backup' && of('Backup antigo').twins === 1, 'a folder named as a backup stays, with how many of its photos are elsewhere', JSON.stringify(of('Backup antigo')));
  check(of('Rome (2)')?.kind === 'keep' && of('Rome (2)').reason === 'copies' && of('Rome (2)').twins === 5, 'a folder whose photos are all elsewhere is a copy: it stays', JSON.stringify(of('Rome (2)')));
  check(of('2019/Rome')?.kind === 'theme', 'the folder the copies came from is still a subject', JSON.stringify(of('2019/Rome')));
  // two folders that are copies of each other: one is the original
  const pair = proposeReorganization({ items: [...[0, 1, 2].map((i) => mk(i, `A trip/IMG_${i}.jpg`, T + i * day)), ...[0, 1, 2].map((i) => mk(10 + i, `B trip/IMG_${i}.jpg`, T + i * day))] });
  const kinds = ['A trip', 'B trip'].map((d) => pair.groups.find((x) => x.src === d)?.reason).join();
  check(kinds === 'eventDays,copies', 'of two folders that are copies of each other, the first stays a subject and the other is the copy', kinds);
}

console.log(failures ? `\n${failures} failure(s)` : '\nall passed');
process.exit(failures ? 1 : 0);
