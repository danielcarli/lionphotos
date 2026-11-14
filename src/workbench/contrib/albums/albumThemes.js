/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// The themes LionPhotos recognizes in photos, for the album suggestions (albumSuggest.js). Each theme is
// known by three kinds of signs:
//   - what the photo shows (read from its thumbnail on this computer, sceneDetector.js): ImageNet classes
//     (seashore, alp, groom, pizza…) and COCO objects (cake, surfboard, wine glass…), each with a weight;
//   - words in the names of its folder and file, its description and keywords (praia, aniversário…);
//   - for the holidays, the date itself (Christmas, New Year, Carnival, Easter).
// `event` themes name an event ("Birthday of Ana 2024", "Beach Jan 2025"); `collection` themes also make an
// album of their own across the years ("Food", "Cars").

/** ImageNet class indices (0–999) with a weight, written as ranges where the classes are neighbours. */
const net = (...parts) => {
  const m = {};
  for (const [spec, w] of parts) for (const r of String(spec).split(',')) {
    const [a, b] = r.split('-').map(Number);
    for (let i = a; i <= (b ?? a); i++) m[i] = w;
  }
  return m;
};

export const THEMES = [
  // celebrations: a few photos are enough (a cake, a gown)
  { id: 'wedding', event: true, min: 0.12, imagenet: net(['578,982', 1], ['601', 0.6], ['689', 0.5], ['457,834', 0.3], ['406', 0.5]), coco: { 32: 0.2 },
    words: ['casamento', 'casorio', 'wedding', 'boda', 'bodas', 'noivos', 'noivado', 'noiva', 'matrimonio', 'mariage', 'hochzeit', 'matrimonio'] },
  { id: 'birthday', event: true, min: 0.1, imagenet: net(['417', 0.7], ['470', 0.5], ['509', 0.3]), coco: { 61: 1 },
    words: ['aniversario', 'niver', 'birthday', 'bday', 'cumpleanos', 'cumple', 'anniversaire', 'geburtstag', 'compleanno', 'parabens', 'mesversario'] },
  { id: 'graduation', event: true, min: 0.1, imagenet: net(['400,667', 1]), coco: {},
    words: ['formatura', 'graduation', 'colacao', 'graduacion', 'formatur', 'laurea', 'diplomacao'] },
  { id: 'baptism', event: true, min: 1, imagenet: {}, coco: {},
    words: ['batizado', 'batismo', 'baptism', 'christening', 'bautizo', 'bapteme', 'taufe', 'battesimo', 'crisma', 'comunhao', 'communion'] },
  { id: 'christmas', event: true, min: 0.1, imagenet: net(['496', 1]), coco: {}, holiday: 'christmas',
    words: ['natal', 'christmas', 'xmas', 'navidad', 'noel', 'weihnachten', 'natale', 'ceia'] },
  { id: 'newyear', event: true, min: 1, imagenet: {}, coco: {}, holiday: 'newyear',
    words: ['reveillon', 'ano novo', 'anonovo', 'new year', 'newyear', 'ano nuevo', 'nochevieja', 'silvester', 'capodanno', 'virada'] },
  { id: 'carnival', event: true, min: 1, imagenet: {}, coco: {}, holiday: 'carnival',
    words: ['carnaval', 'carnival', 'karneval', 'carnevale', 'bloco', 'folia'] },
  { id: 'easter', event: true, min: 1, imagenet: {}, coco: {}, holiday: 'easter',
    words: ['pascoa', 'easter', 'pascua', 'paques', 'ostern', 'pasqua'] },
  { id: 'baby', event: true, collection: true, min: 0.2, imagenet: net(['431,516,520,529,680', 1], ['443', 0.6], ['850', 0.4]), coco: { 88: 0.4 },
    words: ['bebe', 'baby', 'newborn', 'recem nascido', 'maternidade', 'gestante', 'gravidez', 'cha de bebe', 'cha de fralda', 'ensaio newborn'] },
  { id: 'party', event: true, min: 0.25, imagenet: net(['417', 0.5], ['966,907', 0.5], ['440,441,572', 0.5], ['503', 0.6], ['969', 0.3]), coco: { 46: 0.6, 44: 0.2 },
    words: ['festa', 'party', 'fiesta', 'fete', 'feier', 'balada', 'confraternizacao', 'happy hour', 'churrasco', 'jantar'] },
  // places and outings
  { id: 'beach', event: true, min: 0.3, imagenet: net(['978,977', 1], ['976', 0.6], ['973,983,801', 0.8], ['445,638,639,842', 0.8], ['460', 0.6], ['838', 0.4]), coco: { 42: 1, 38: 0.3 },
    words: ['praia', 'beach', 'playa', 'plage', 'strand', 'spiaggia', 'litoral', 'surf', 'beira mar'] },
  { id: 'mountain', event: true, min: 0.3, imagenet: net(['970,979', 1], ['972,980', 0.8], ['672', 0.8], ['671', 0.4], ['349,350', 0.5]), coco: {},
    words: ['montanha', 'serra', 'trilha', 'mountain', 'montana', 'montagne', 'berg', 'hiking', 'trekking', 'pico', 'morro', 'escalada'] },
  { id: 'snow', event: true, min: 0.3, imagenet: net(['795,802,803,537,450', 1], ['796', 0.7], ['658', 0.4]), coco: { 35: 1, 36: 1 },
    words: ['neve', 'snow', 'nieve', 'neige', 'schnee', 'ski', 'esqui'] },
  { id: 'lake', event: true, min: 0.3, imagenet: net(['975', 1], ['536,718,449', 0.7], ['472,693', 0.7], ['525', 0.5], ['974', 0.7]), coco: {},
    words: ['lago', 'lake', 'rio', 'river', 'represa', 'cachoeira', 'waterfall', 'cascata', 'lac'] },
  { id: 'countryside', event: true, min: 0.3, imagenet: net(['425,958,595,856,866,730', 1], ['690,603', 0.8], ['912', 0.6], ['345,341', 0.6]), coco: { 19: 0.5, 20: 0.7, 21: 0.7 },
    words: ['fazenda', 'sitio', 'chacara', 'farm', 'campo', 'rural', 'rancho', 'granja'] },
  { id: 'city', event: true, min: 0.35, imagenet: net(['497,698,663,668,538,873,483,442,682,832', 1], ['821,839,888', 0.8], ['919,920', 0.6], ['829,874,468', 0.5], ['900,562,727,498', 0.5], ['624,858,825', 0.3]), coco: { 10: 0.3, 13: 0.4 },
    words: ['cidade', 'city', 'ciudad', 'ville', 'stadt', 'centro', 'downtown', 'arquitetura', 'architecture', 'museu', 'museum'] },
  { id: 'music', event: true, collection: true, min: 0.25, imagenet: net(['401,402,420,432,486,513,541,546,558,566,579,593,594,642,683,687,699,776,822,875,881,889', 1], ['650,819', 0.6], ['854', 0.5], ['632', 0.3]), coco: {},
    words: ['show', 'concert', 'concerto', 'musica', 'music', 'festival', 'recital', 'banda', 'orquestra', 'coral', 'konzert'] },
  { id: 'sport', event: true, collection: true, min: 0.25, imagenet: net(['429,430,805,890,768,852,574,981,560,781', 1], ['416,602,702,422,543,747', 0.8], ['752,575', 0.8], ['770,610,518', 0.3]), coco: { 37: 1, 39: 1, 40: 1, 41: 0.8, 43: 1, 34: 0.5 },
    words: ['futebol', 'jogo', 'esporte', 'sport', 'deporte', 'corrida', 'maratona', 'marathon', 'tenis', 'volei', 'basquete', 'academia', 'gym', 'ciclismo', 'pedal', 'campeonato', 'torneio'] },
  // subjects that make albums of their own across the years
  { id: 'food', collection: true, event: false, min: 0.35, imagenet: net(['923-935', 1], ['959-965', 1], ['936-957', 0.6], ['809,926', 0.8], ['762', 0.6], ['567,909', 0.4], ['967,968', 0.4]), coco: { 52: 0.6, 53: 0.5, 54: 1, 55: 0.5, 56: 0.6, 57: 0.6, 58: 1, 59: 1, 60: 1, 51: 0.4, 48: 0.3, 49: 0.3, 50: 0.3, 67: 0.3 },
    words: ['comida', 'food', 'receita', 'recipe', 'restaurante', 'restaurant', 'gastronomia', 'almoco', 'jantar', 'cafe da manha', 'pratos'] },
  { id: 'nature', collection: true, event: false, min: 0.35, imagenet: net(['985,986,984,989', 1], ['988,990-997', 0.8], ['580', 0.7], ['321-326,309,319,320', 0.7]), coco: { 64: 0.4, 86: 0.2 },
    words: ['flores', 'flor', 'flowers', 'flower', 'jardim', 'garden', 'jardin', 'natureza', 'nature', 'plantas', 'orquideas', 'macro'] },
  { id: 'wildlife', collection: true, event: false, min: 0.4, imagenet: net(['0-150', 0.8], ['269-280,286-299,330-397', 1]), coco: { 16: 0.6, 22: 1, 23: 1, 24: 1, 25: 1 },
    words: ['zoologico', 'zoo', 'safari', 'aquario', 'aquarium', 'animais', 'animals', 'aves', 'birds', 'passaros', 'birdwatching'] },
  { id: 'pets', collection: true, event: false, min: 0.4, imagenet: net(['151-268', 1], ['281-285', 1]), coco: { 17: 1, 18: 1 },
    words: ['cachorro', 'cao', 'gato', 'gatos', 'dog', 'dogs', 'cat', 'cats', 'perro', 'pet', 'pets'] },
  { id: 'cars', collection: true, event: false, min: 0.4, imagenet: net(['817,511,751,627,661,609', 1], ['436,656,717', 0.6], ['479,581,535,475', 0.8], ['573', 0.8], ['665,670', 0.6]), coco: { 3: 0.4, 4: 0.5 },
    words: ['carro', 'carros', 'car', 'cars', 'auto', 'autos', 'moto', 'motos', 'motorcycle', 'automovel', 'classicos', 'track day'] },
  { id: 'planes', collection: true, event: false, min: 0.4, imagenet: net(['404,895,405', 1], ['908', 0.8]), coco: { 5: 1 },
    words: ['aviao', 'avioes', 'aeroporto', 'airport', 'plane', 'planes', 'aviation', 'aviacao', 'voo', 'flight'] },
  { id: 'trains', collection: true, event: false, min: 0.4, imagenet: net(['466,547,820,565,705', 1], ['829', 0.5]), coco: { 7: 1 },
    words: ['trem', 'trens', 'train', 'trains', 'ferrovia', 'railway', 'tren', 'maria fumaca'] },
  { id: 'boats', collection: true, event: true, min: 0.4, imagenet: net(['484,871,914,780,814,628,625,576,554,694', 1], ['510,913', 0.8]), coco: { 9: 1 },
    words: ['barco', 'barcos', 'veleiro', 'lancha', 'boat', 'boats', 'sailing', 'regata', 'navio', 'cruzeiro', 'cruise'] },
  { id: 'documents', collection: true, event: false, min: 0.4, imagenet: net(['916,917,918,921', 1], ['549,446,713', 0.8], ['922', 0.5], ['692,782,664', 0.5], ['851,620,508,742,681', 0.4], ['878', 0.3]), coco: { 84: 0.4 },
    words: ['documento', 'documentos', 'document', 'documents', 'scan', 'scans', 'digitalizacao', 'digitalizado', 'recibo', 'receipt', 'nota fiscal', 'comprovante', 'screenshot', 'screenshots', 'captura de tela', 'capturas de tela', 'screen shot', 'prints de tela'] },
];

export const THEME = Object.fromEntries(THEMES.map((t) => [t.id, t]));

/** Lower case, no accents, separators as spaces: how words are compared. */
export const fold = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[_\-.]+/g, ' ');

// one regular expression per theme, on whole words
const WORD_RE = new Map(THEMES.map((t) => [t.id, new RegExp(`(?:^|[^a-z0-9])(?:${t.words.map((w) => fold(w).replace(/ /g, '\\s*')).join('|')})(?:$|[^a-z0-9])`)]));

/** The themes whose words are in a text (a folder's or a file's name, a description). @returns {string[]} */
export function themesInText(text) {
  const s = fold(text);
  if (!s) return [];
  const out = [];
  for (const [id, re] of WORD_RE) if (re.test(s)) out.push(id);
  return out;
}

// screenshots by their name: "Screenshot_20240102", "Captura de Tela 2024-01-02", "Screen Shot 2024…"
export const SCREENSHOT_RE = /^(screenshot|screen shot|captura de tela|captura de pantalla|capture d.ecran|bildschirmfoto|schermata|スクリーンショット|屏幕截图)/i;

/**
 * What a photo shows as themes, from the text kept by the scene reader ("978:61,975:12;1:3,42:1").
 * @returns {{ themes: Map<string, number>, people: number }} each theme with its strength 0..1; people: how many persons were found
 */
export function themesOfScene(data) {
  const themes = new Map();
  let people = 0;
  if (!data) return { themes, people };
  const [classes = '', objects = ''] = String(data).split(';');
  const add = (id, v) => { if (v > 0) themes.set(id, Math.min(1, (themes.get(id) || 0) + v)); };
  for (const part of classes.split(',')) {
    if (!part) continue;
    const [k, p] = part.split(':').map(Number);
    for (const t of THEMES) { const w = t.imagenet[k]; if (w) add(t.id, w * (p / 100) * 1.6); }
  }
  for (const part of objects.split(',')) {
    if (!part) continue;
    const [k, n] = part.split(':').map(Number);
    if (k === 1) { people += n; continue; }
    for (const t of THEMES) { const w = t.coco[k]; if (w) add(t.id, w * Math.min(1, 0.55 + 0.15 * n)); }
  }
  return { themes, people };
}

/** Easter Sunday of a year (Gregorian, anonymous algorithm), as a local date. */
export function easter(year) {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

const easterCache = new Map();
const dayNumber = (d) => Math.round(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 86400000);

/** The holiday of a day, if any: 'christmas' (24–25 Dec), 'newyear' (31 Dec–1 Jan), 'carnival' (the Friday to Ash Wednesday), 'easter' (Good Friday to Sunday). */
export function holidayOf(ms) {
  const d = new Date(ms);
  const m = d.getMonth() + 1, day = d.getDate(), y = d.getFullYear();
  if (m === 12 && (day === 24 || day === 25)) return 'christmas';
  if ((m === 12 && day === 31) || (m === 1 && day === 1)) return 'newyear';
  if (m >= 2 && m <= 4) {
    if (!easterCache.has(y)) easterCache.set(y, dayNumber(easter(y)));
    const delta = dayNumber(d) - easterCache.get(y);
    if (delta >= -51 && delta <= -46) return 'carnival';
    if (delta >= -2 && delta <= 0) return 'easter';
  }
  return null;
}
