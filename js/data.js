'use strict';
/* ===== Catalogs, save data and derived stats ===== */

const RAR = {
  common:    { n: 'Common',    c: '#cfcac0', i: 0 },
  uncommon:  { n: 'Uncommon',  c: '#7be07a', i: 1 },
  rare:      { n: 'Rare',      c: '#5fb0ff', i: 2 },
  epic:      { n: 'Epic',      c: '#c886ff', i: 3 },
  legendary: { n: 'Legendary', c: '#ffb53d', i: 4 },
  mythic:    { n: 'Mythic',    c: '#ff5fb0', i: 5 },
};
const RAR_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];

const SWORDS = [
  { id: 'bokken', name: 'Oak Bokken', r: 'common', dmg: 7, blade: '#a8743f', edge: '#d8a86a', tsuba: '#4a3020', wrap: '#3a2a1c', wood: true, lore: 'Your first practice sword. Every legend starts somewhere.' },
  { id: 'rusty', name: 'Rusty Wakizashi', r: 'common', dmg: 9, blade: '#8f8172', edge: '#cdbda6', tsuba: '#5d4128', wrap: '#4a3b30', lore: 'Short, chipped, and stubborn.' },
  { id: 'iron', name: 'Iron Katana', r: 'common', dmg: 11, blade: '#b9c3cc', edge: '#f1f5f8', tsuba: '#3d3d44', wrap: '#1f2638', lore: 'Plain steel that never quits.' },
  { id: 'river', name: 'Riverstone Katana', r: 'uncommon', dmg: 14, blade: '#8cc3c4', edge: '#e8fdff', tsuba: '#2c5a57', wrap: '#173533', lore: 'Polished by a mountain river for a hundred years.' },
  { id: 'crane', name: 'Crane Feather', r: 'uncommon', dmg: 15, blade: '#e8ebf0', edge: '#ffffff', tsuba: '#c0392b', wrap: '#efe9dc', lore: 'Light as a feather, quick as a crane.' },
  { id: 'moon', name: 'Moonlit Tachi', r: 'rare', dmg: 19, blade: '#c3d2ff', edge: '#ffffff', tsuba: '#4f5ca0', wrap: '#1a2150', glow: '#8fa8ff', lore: 'Glows softly under the night sky.' },
  { id: 'ember', name: 'Ember Fang', r: 'rare', dmg: 20, blade: '#ff8f4f', edge: '#fff0b8', tsuba: '#5a1d0d', wrap: '#2a0e08', glow: '#ff6a1f', lore: 'Still warm from the forge fire.' },
  { id: 'storm', name: 'Storm Edge', r: 'epic', dmg: 25, blade: '#9feaff', edge: '#ffffff', tsuba: '#2d4677', wrap: '#0f1933', glow: '#3fd0ff', lore: 'Crackles like lightning when swung.' },
  { id: 'jade', name: 'Jade Serpent', r: 'epic', dmg: 26, blade: '#6fe0aa', edge: '#e3fff0', tsuba: '#1b6646', wrap: '#0d2a1f', glow: '#2fe08f', lore: 'Coils and strikes like a snake.' },
  { id: 'oni', name: 'Oni Cleaver', r: 'epic', dmg: 28, blade: '#d9d0c4', edge: '#ffffff', tsuba: '#6b0f12', wrap: '#1a0505', glow: '#ff3b3b', lore: 'Taken from the demon of the temple gate.' },
  { id: 'sakura', name: 'Thousand Sakura', r: 'legendary', dmg: 33, blade: '#ffbfd9', edge: '#ffffff', tsuba: '#b02f6a', wrap: '#3a0f22', glow: '#ff6fb0', lore: 'Every swing scatters a storm of petals.' },
  { id: 'dragon', name: "Dragon's Breath", r: 'legendary', dmg: 35, blade: '#ffd164', edge: '#fffbe0', tsuba: '#875700', wrap: '#2b1a00', glow: '#ffa915', lore: 'Forged in dragon fire on the burning peak.' },
  { id: 'void', name: 'Void Crescent', r: 'mythic', dmg: 44, blade: '#2b1647', edge: '#f0c4ff', tsuba: '#120a1f', wrap: '#06020c', glow: '#b357ff', lore: 'The rarest blade in the land. Only one exists.' },
];

const OUTFITS = [
  { id: 'ronin', name: 'Wandering Ronin', cloth: '#2f3f6e', armor: '#3a3f55', trim: '#d6b878', helm: 'kasa', helmCol: '#c9a35a', crest: null, eye: '#ffe6a0', hp: 0, dmg: 0, how: { free: 1 }, desc: 'A straw hat and a long road.' },
  { id: 'crimson', name: 'Crimson Lacquer', cloth: '#3d1416', armor: '#b0262d', trim: '#f0bd4a', helm: 'kabuto', helmCol: '#8a1d22', crest: 'horns', crestCol: '#f0bd4a', eye: '#ffd27a', hp: 15, dmg: 0, how: { boss: 2 }, desc: 'Shiny red armor of a village captain.' },
  { id: 'shadow', name: 'Shadow Shinobi', cloth: '#17181f', armor: '#262833', trim: '#8a90a8', helm: 'hood', helmCol: '#1b1c24', crest: null, eye: '#9be7ff', scarf: '#d0352a', hp: 10, dmg: 0.05, how: { gold: 600 }, desc: 'Silent, fast, and very cool.' },
  { id: 'snow', name: 'Snow Fox', cloth: '#2f4a6b', armor: '#e6eef7', trim: '#6fb7ff', helm: 'kabuto', helmCol: '#f2f6fb', crest: 'moon', crestCol: '#9fd4ff', eye: '#7fe0ff', hp: 25, dmg: 0.03, how: { boss: 5 }, desc: 'Armor as white as fresh snow.' },
  { id: 'jademonk', name: 'Jade Monk', cloth: '#1f5a45', armor: '#3c8c6b', trim: '#f2dc8a', helm: 'band', helmCol: '#f2dc8a', crest: null, eye: '#b8ffcf', hp: 30, dmg: 0.04, how: { gold: 1200 }, desc: 'Calm mind, strong hands.' },
  { id: 'golden', name: 'Golden Shogun', cloth: '#2a1d0c', armor: '#e0aa35', trim: '#fff1b8', helm: 'kabuto', helmCol: '#c8901f', crest: 'sun', crestCol: '#ffe27a', eye: '#ffe27a', banner: '#e0aa35', hp: 40, dmg: 0.06, how: { boss: 8 }, desc: 'The armor of a great lord, with a war banner.' },
  { id: 'sakuraspirit', name: 'Sakura Spirit', cloth: '#7a2c52', armor: '#f19cc2', trim: '#ffffff', helm: 'kabuto', helmCol: '#f7c3da', crest: 'flower', crestCol: '#ffffff', eye: '#ffd1ea', aura: '#ff8fc4', hp: 35, dmg: 0.08, how: { gold: 2500 }, desc: 'Petals swirl around you wherever you go.' },
  { id: 'dragonlord', name: 'Dragon Lord', cloth: '#3b0d12', armor: '#1c1e2a', trim: '#ffae1a', helm: 'kabuto', helmCol: '#12131b', crest: 'dragon', crestCol: '#ffae1a', eye: '#d77bff', aura: '#ff7a1a', banner: '#ff7a1a', hp: 60, dmg: 0.12, how: { boss: 11 }, desc: 'Armor of the Dragon Shogun himself.' },
];

const CHAPTERS = [
  { name: 'Bamboo Village', jp: '竹の村', blurb: 'Sunset over the bamboo groves.' },
  { name: 'Frozen Pass', jp: '氷の峠', blurb: 'Snow, pines and dancing northern lights.' },
  { name: 'Shadow Castle', jp: '影の城', blurb: 'Lanterns glow under a purple moon.' },
  { name: 'Dragon Peak', jp: '龍の峰', blurb: 'Lava rivers, and a dragon in the sky.' },
];

const STAGES = [
  { ch: 0, name: 'Kenji', title: 'the Bamboo Bandit', hp: 60, dmg: 7, tele: 1500, guard: .08, combo: 0, feint: 0, low: 0, sword: 'rusty', gold: 45, steel: 3,
    look: { cloth: '#4a3a2a', armor: '#6d5a43', trim: '#c0452f', helm: 'band', helmCol: '#c0452f', crest: null, eye: '#ffcf8a' } },
  { ch: 0, name: 'Taro', title: 'the Lone Ronin', hp: 85, dmg: 8, tele: 1380, guard: .15, combo: .06, feint: 0, low: 0, sword: 'iron', gold: 60, steel: 4,
    look: { cloth: '#283044', armor: '#4b5563', trim: '#d1c7a3', helm: 'kasa', helmCol: '#a8854a', crest: null, eye: '#ffe9a8' } },
  { ch: 0, boss: 1, name: 'Captain Haru', title: 'the Crimson Fang', hp: 150, dmg: 11, tele: 1260, guard: .22, combo: .15, feint: 0, low: .1, sword: 'river', gold: 120, steel: 8, outfit: 'crimson',
    look: { cloth: '#3b1a16', armor: '#9c2f24', trim: '#e8b54a', helm: 'kabuto', helmCol: '#6e1f19', crest: 'horns', crestCol: '#e8b54a', eye: '#ff8a5a', banner: '#9c2f24' } },
  { ch: 1, name: 'Brother Gen', title: 'the Mountain Monk', hp: 150, dmg: 12, tele: 1180, guard: .24, combo: .12, feint: 0, low: .15, sword: 'crane', gold: 90, steel: 6,
    look: { cloth: '#e6dcc6', armor: '#b58a52', trim: '#8a3324', helm: 'band', helmCol: '#8a3324', crest: null, eye: '#9fe0ff' } },
  { ch: 1, name: 'Sora', title: 'the Ice Ronin', hp: 185, dmg: 13, tele: 1100, guard: .27, combo: .18, feint: .05, low: .15, sword: 'moon', gold: 110, steel: 7,
    look: { cloth: '#2e425c', armor: '#8fb0cf', trim: '#ffffff', helm: 'hood', helmCol: '#3d5675', crest: null, eye: '#bfe9ff', scarf: '#bfe9ff' } },
  { ch: 1, boss: 1, name: 'Yuki', title: 'the Frost Blade', hp: 270, dmg: 16, tele: 1030, guard: .3, combo: .25, feint: .1, low: .2, sword: 'ember', gold: 180, steel: 12, outfit: 'snow',
    look: { cloth: '#34557a', armor: '#e5eef8', trim: '#5fb0ff', helm: 'kabuto', helmCol: '#d8e6f4', crest: 'moon', crestCol: '#8fd0ff', eye: '#7fe8ff', banner: '#5fb0ff', aura: '#9fe6ff' } },
  { ch: 2, name: 'Shadow Guard', title: 'of Kuro Castle', hp: 260, dmg: 17, tele: 980, guard: .32, combo: .22, feint: .15, low: .2, sword: 'storm', gold: 140, steel: 9,
    look: { cloth: '#191822', armor: '#2c2a3a', trim: '#7f70b8', helm: 'kabuto', helmCol: '#22202e', crest: null, eye: '#c9a0ff' } },
  { ch: 2, name: 'Rei', title: 'the Twin Fang Ninja', hp: 290, dmg: 18, tele: 930, guard: .35, combo: .3, feint: .25, low: .25, sword: 'jade', gold: 160, steel: 10,
    look: { cloth: '#121218', armor: '#1f1f27', trim: '#d23a3a', helm: 'hood', helmCol: '#15151c', crest: null, eye: '#ff6b6b', scarf: '#d23a3a' } },
  { ch: 2, boss: 1, name: 'Lord Kuro', title: 'the Shadow Lord', hp: 400, dmg: 21, tele: 880, guard: .38, combo: .35, feint: .25, low: .25, sword: 'sakura', gold: 260, steel: 16, outfit: 'golden',
    look: { cloth: '#241a33', armor: '#15141a', trim: '#d9b13d', helm: 'kabuto', helmCol: '#0e0d12', crest: 'horns', crestCol: '#d9b13d', eye: '#ffd24a', banner: '#5a2a8a', aura: '#8a5aff' } },
  { ch: 3, name: 'Temple Sentinel', title: 'Guardian of the Gate', hp: 400, dmg: 22, tele: 840, guard: .4, combo: .32, feint: .3, low: .3, sword: 'oni', gold: 220, steel: 14,
    look: { cloth: '#2d3323', armor: '#5f6e48', trim: '#e0c77a', helm: 'kabuto', helmCol: '#4a5839', crest: 'oni', crestCol: '#e0c77a', eye: '#baff8a' } },
  { ch: 3, name: 'Goro', title: 'the Fire Oni', hp: 460, dmg: 24, tele: 800, guard: .4, combo: .4, feint: .3, low: .3, sword: 'dragon', gold: 250, steel: 15,
    look: { cloth: '#2a0d08', armor: '#8f1d12', trim: '#ffa01a', helm: 'kabuto', helmCol: '#5c0f0a', crest: 'oni', crestCol: '#ffa01a', eye: '#ffd23a', aura: '#ff6a1a' } },
  { ch: 3, boss: 1, name: 'The Dragon Shogun', title: 'Master of Dragon Peak', hp: 620, dmg: 28, tele: 760, guard: .45, combo: .5, feint: .35, low: .35, sword: 'void', gold: 500, steel: 30, outfit: 'dragonlord',
    look: { cloth: '#3b0d12', armor: '#1c1e2a', trim: '#ffae1a', helm: 'kabuto', helmCol: '#12131b', crest: 'dragon', crestCol: '#ffae1a', eye: '#e08bff', banner: '#ff7a1a', aura: '#c35cff' } },
];

const SKILLS = {
  power: { n: 'Power', g: '力', d: 'More damage with every slash' },
  speed: { n: 'Speed', g: '速', d: 'Slash again sooner' },
  guard: { n: 'Guard', g: '守', d: 'Easier parries and stronger blocks' },
  vital: { n: 'Vitality', g: '命', d: 'More health in battle' },
};

const TRAININGS = {
  bamboo: { name: 'Bamboo Cutting', skill: 'power', g: '力', desc: 'Bamboo shoots up from the floor. Slice through as many as you can in 30 seconds. Avoid the stone pillars!' },
  reflex: { name: 'Lightning Reflex', skill: 'speed', g: '速', desc: 'Swipe the way the arrow points before the circle closes. It gets faster!' },
  parry: { name: 'Sensei Parry Drill', skill: 'guard', g: '守', desc: 'The sensei swings a practice sword. Swipe through the gold ring right as it flashes.' },
  stance: { name: 'Lantern Focus', skill: 'vital', g: '命', desc: 'Keep your finger on the floating lantern. Stay calm and follow it everywhere.' },
};

const DUMMY_LOOK = { cloth: '#6b5233', armor: '#c9a35a', trim: '#7a4a24', helm: 'band', helmCol: '#ffffff', crest: null, eye: '#ffd890' };
const SENSEI_LOOK = { cloth: '#1f2a4a', armor: '#e9e1cc', trim: '#c0392b', helm: 'band', helmCol: '#c0392b', crest: null, eye: '#ffe6a0' };

/* ---------- save ---------- */
const SAVE_KEY = 'shep-katana-legend-3d-v1';
function freshSave() {
  return {
    gold: 80, steel: 6, cleared: 0, stars: {},
    swords: [{ u: 1, id: 'bokken', lvl: 0 }], eq: 1, nu: 2,
    outfits: ['ronin'], outfit: 'ronin',
    sk: { power: { l: 1, x: 0 }, speed: { l: 1, x: 0 }, guard: { l: 1, x: 0 }, vital: { l: 1, x: 0 } },
    seen: ['bokken'], sound: true, music: true, quality: 'auto', view: 'fp', wins: 0, parries: 0, name: 'Shep',
  };
}
function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const o = JSON.parse(raw), f = freshSave();
      const merged = Object.assign(f, o);
      merged.sk = Object.assign(freshSave().sk, o.sk || {});
      if (!merged.swords || !merged.swords.length) merged.swords = f.swords;
      return merged;
    }
  } catch (e) { /* storage unavailable */ }
  return freshSave();
}
let S = loadSave();
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } }

/* ---------- lookups & stats ---------- */
const swordDef = id => SWORDS.find(s => s.id === id) || SWORDS[0];
const outfitDef = id => OUTFITS.find(o => o.id === id) || OUTFITS[0];
function eqSword() { return S.swords.find(w => w.u === S.eq) || S.swords[0]; }
function swordDmg(w) { return swordDef(w.id).dmg * (1 + 0.12 * (w.lvl || 0)); }
function skillNeed(l) { return 40 + l * 30; }
function stats() {
  const o = outfitDef(S.outfit), k = S.sk;
  return {
    maxHp: Math.round(100 + (k.vital.l - 1) * 12 + (o.hp || 0)),
    atk: swordDmg(eqSword()) * (1 + (k.power.l - 1) * 0.08 + (o.dmg || 0)),
    cd: Math.max(110, 380 - (k.speed.l - 1) * 13),
    parry: Math.min(0.78, 0.42 + (k.guard.l - 1) * 0.022),
    block: Math.min(0.88, 0.55 + (k.guard.l - 1) * 0.018),
  };
}
function lookFromOutfit(o) {
  return { cloth: o.cloth, armor: o.armor, trim: o.trim, helm: o.helm, helmCol: o.helmCol, crest: o.crest, crestCol: o.crestCol,
    eye: o.eye, scarf: o.scarf, banner: o.banner, aura: o.aura };
}
function addSkillXP(key, n) {
  const s = S.sk[key]; let ups = 0; s.x += n;
  while (s.l < 30 && s.x >= skillNeed(s.l)) { s.x -= skillNeed(s.l); s.l++; ups++; }
  if (s.l >= 30) s.x = 0;
  return ups;
}
function smeltValue(w) { return [3, 5, 9, 15, 30, 60][RAR[swordDef(w.id).r].i] + (w.lvl || 0) * 2; }
function forgeCost(w) {
  const ri = RAR[swordDef(w.id).r].i, l = w.lvl || 0;
  return { gold: Math.round((30 + l * 28) * (1 + ri * 0.55)), steel: 2 + l + ri };
}
const CRAFT_COST = { gold: 150, steel: 20 };
const CRAFT_ODDS = [['common', 44], ['uncommon', 30], ['rare', 17], ['epic', 7], ['legendary', 1.8], ['mythic', 0.2]];
function addSword(id) {
  const w = { u: S.nu++, id, lvl: 0 };
  S.swords.push(w);
  if (!S.seen.includes(id)) S.seen.push(id);
  return w;
}
function ownsSword(id) { return S.swords.some(w => w.id === id); }
function bestSword() {
  return S.swords.slice().sort((a, b) => RAR[swordDef(b.id).r].i - RAR[swordDef(a.id).r].i || swordDmg(b) - swordDmg(a))[0];
}
function totalStars() { return Object.values(S.stars).reduce((a, b) => a + b, 0); }
