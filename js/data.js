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
  { id: 'void', name: 'Void Crescent', r: 'mythic', dmg: 44, blade: '#2b1647', edge: '#f0c4ff', tsuba: '#120a1f', wrap: '#06020c', glow: '#b357ff', lore: 'Carried by the Dragon Shogun. Darker than a moonless night.' },
  { id: 'ogre', name: 'Ogre Tooth', r: 'rare', dmg: 22, blade: '#e9dcc4', edge: '#fff6e0', tsuba: '#8a1d12', wrap: '#2a0c08', glow: '#ff5a3a', myth: 0, lore: 'Carved from the tusk of Akaoni, the Mountain Ogre.' },
  { id: 'frost', name: 'Frostbite', r: 'epic', dmg: 30, blade: '#bfefff', edge: '#ffffff', tsuba: '#3a6a9a', wrap: '#0c1a33', glow: '#7fe8ff', myth: 1, lore: 'Ice from the Frost Giant\'s heart. It never melts.' },
  { id: 'tengu', name: 'Tengu Wing', r: 'legendary', dmg: 38, blade: '#2a2a33', edge: '#ffd27a', tsuba: '#c0392b', wrap: '#120a0a', glow: '#ffb03a', myth: 2, lore: 'Light as a feather from the Tengu King\'s wing.' },
  { id: 'ryujin', name: "Ryujin's Fang", r: 'mythic', dmg: 50, blade: '#ffe7a0', edge: '#ffffff', tsuba: '#c2301a', wrap: '#3a0a06', glow: '#ff7a1a', myth: 3, lore: 'A fang of Ryujin, the Sky Dragon. The greatest blade ever forged.' },
];
/* Blades of the three new lands (warriors, 4th warriors, bosses), the new beasts, and new forged legends */
SWORDS.push(
  { id: 'cedarfang', name: 'Cedar Fang', r: 'epic', dmg: 46, blade: '#d8c8a8', edge: '#fffaf0', tsuba: '#4a2e1a', wrap: '#1e140c', lore: 'Cut from a cedar grove where foxes play.' },
  { id: 'shidare', name: 'Shidare', r: 'epic', dmg: 50, blade: '#ffd0e4', edge: '#ffffff', tsuba: '#7a2a4a', wrap: '#2a0a1a', glow: '#ff9ac8', el: 'spirit', lore: 'The Weeping Blade. It sways like a cherry branch.' },
  { id: 'shidaremk2', name: 'Shidare Unbound', r: 'legendary', dmg: 56, blade: '#ffb8d8', edge: '#ffffff', tsuba: '#a02a5a', wrap: '#2a0a1a', glow: '#ff6ab0', el: 'spirit', lore: 'Sakurako trained a whole winter to make it sharper.' },
  { id: 'kakunodate', name: 'Black Fence Katana', r: 'legendary', dmg: 60, blade: '#3a3a44', edge: '#ffd8ec', tsuba: '#c9a030', wrap: '#120a0e', glow: '#ff8ac8', lore: 'Carried by the General of the Weeping Cherries.' },
  { id: 'ishigaki', name: 'Ishigaki', r: 'legendary', dmg: 62, blade: '#b8b0a0', edge: '#ffffff', tsuba: '#5a4a3a', wrap: '#1a140e', lore: 'Heavy as the stone walls of Azuchi.' },
  { id: 'ikazuchi', name: 'Ikazuchi', r: 'legendary', dmg: 66, blade: '#c8d8ff', edge: '#ffffff', tsuba: '#2a3a8a', wrap: '#0a0e2a', glow: '#8ab8ff', lore: 'Thunder blade. Sparks jump along the edge.' },
  { id: 'stormtwins', name: 'Storm Twins', r: 'legendary', dmg: 70, blade: '#e8f0ff', edge: '#fff7a0', tsuba: '#4a5aa8', wrap: '#0a0e2a', glow: '#fff27a', lore: 'Two storms, one blade.' },
  { id: 'goldenwarlord', name: 'Golden Warlord', r: 'mythic', dmg: 76, blade: '#ffd84a', edge: '#fffbe0', tsuba: '#8a1010', wrap: '#1a0a0a', glow: '#ffc23a', lore: 'The blade of the warlord of the golden tower.' },
  { id: 'nijubashi', name: 'Nijūbashi', r: 'mythic', dmg: 78, blade: '#e8ecf4', edge: '#ffffff', tsuba: '#2a3a2a', wrap: '#0a120a', glow: '#bfe8ff', lore: 'Named for the double bridge over the palace moat.' },
  { id: 'kirin', name: 'Kirin Blade', r: 'mythic', dmg: 82, blade: '#fff0c0', edge: '#ffffff', tsuba: '#c9a030', wrap: '#1a3a2a', glow: '#ffe08c', el: 'spirit', lore: 'Light as a kirin running across the clouds.' },
  { id: 'kirinmk2', name: 'Kirin Ascended', r: 'mythic', dmg: 88, blade: '#fff8e0', edge: '#ffffff', tsuba: '#ffd84a', wrap: '#1a3a2a', glow: '#fff2b0', el: 'spirit', lore: 'It hums with heavenly power.' },
  { id: 'eternal', name: 'Eternal Shogun', r: 'mythic', dmg: 95, blade: '#d8c8ff', edge: '#ffffff', tsuba: '#4a2a8a', wrap: '#0a0618', glow: '#b88aff', lore: 'The blade of the Eternal Shogun of the Imperial Palace.' },
  { id: 'kitsunebi', name: 'Kitsunebi', r: 'mythic', dmg: 64, blade: '#c8fff0', edge: '#ffffff', tsuba: '#e8e0d0', wrap: '#c0281e', glow: '#7affd8', myth: 4, el: 'fire', lore: 'Foxfire, taken from the nine-tailed fox.' },
  { id: 'raikiri', name: 'Raikiri', r: 'mythic', dmg: 80, blade: '#fff7b0', edge: '#ffffff', tsuba: '#1a2a6a', wrap: '#0a0e2a', glow: '#fff27a', myth: 5, crit: .1, lore: 'The Lightning Cutter, said to have split a bolt of thunder.' },
  { id: 'orochi', name: "Orochi's Fang", r: 'mythic', dmg: 100, blade: '#b8ffb0', edge: '#ffffff', tsuba: '#1a3a1a', wrap: '#0a1a0a', glow: '#6aff8a', myth: 6, lore: 'A fang of the eight-headed serpent. Nothing is sharper.' },
  { id: 'yozakura', name: 'Yozakura', r: 'mythic', dmg: 68, blade: '#3a2a4a', edge: '#ffb8e0', tsuba: '#ff9ac8', wrap: '#120a18', glow: '#ff9ac8', forged: true, el: 'spirit', lore: 'Night cherry blossoms glow along its dark steel.' },
  { id: 'raiden', name: 'Raiden', r: 'mythic', dmg: 86, blade: '#e8f0ff', edge: '#fff27a', tsuba: '#2a3a8a', wrap: '#0a0e2a', glow: '#fff27a', forged: true, crit: .12, lore: 'Thunder and lightning, forged into steel.' },
  { id: 'amaterasu', name: 'Amaterasu', r: 'mythic', dmg: 112, blade: '#fff4d0', edge: '#ffffff', tsuba: '#ffb03a', wrap: '#3a1a00', glow: '#ffd84a', forged: true, el: 'all', lore: 'The sun goddess\'s blade. The greatest sword in all the lands.' },
);
/* Blades carried by the 4th warrior of each land */
SWORDS.push(
  { id: 'rival', name: "Rival's Edge", r: 'uncommon', dmg: 13, blade: '#c9d6c2', edge: '#f4fff0', tsuba: '#2f5a3c', wrap: '#1a2a1e', lore: 'Masaru trained every day to beat you. Now it is yours.' },
  { id: 'hailstone', name: 'Hailstone', r: 'rare', dmg: 18, blade: '#d9cfee', edge: '#ffffff', tsuba: '#5a3a7a', wrap: '#2a1a3a', glow: '#b8a8ff', el: 'frost', lore: 'Kaede\'s blade rings like ice cracking on a lake.' },
  { id: 'kagemaru', name: 'Kagemaru', r: 'epic', dmg: 27, blade: '#2a2a33', edge: '#ff8a8a', tsuba: '#7a1010', wrap: '#120a0a', glow: '#ff4a4a', el: 'shadow', lore: 'The Shadow Circle. Rei sharpened it for one rematch.' },
  { id: 'twinflame', name: 'Twin Flame', r: 'legendary', dmg: 34, blade: '#ff9a5a', edge: '#fff0c0', tsuba: '#1d4a8f', wrap: '#2a0d08', glow: '#ff8a3a', el: 'fire', lore: 'Forged for two brothers. Half red fire, half blue.' },
);
/* Blades forged from recipes at the smithy */
SWORDS.push(
  { id: 'kanemitsu', name: 'Kanemitsu Tachi', r: 'rare', dmg: 22, blade: '#d8dde6', edge: '#ffffff', tsuba: '#7a5a2a', wrap: '#3a1a10', glow: '#ffe08c', forged: true, crit: .08, lore: 'A smith\'s first masterpiece. Its edge finds every gap.' },
  { id: 'kagaribi', name: 'Kagaribi', r: 'epic', dmg: 30, blade: '#ff9a4a', edge: '#fff2c0', tsuba: '#3a1408', wrap: '#1a0806', glow: '#ff6a1a', forged: true, el: 'fire', lore: 'The Bonfire Blade. Snow melts where it passes.' },
  { id: 'tsukikage', name: 'Tsukikage', r: 'legendary', dmg: 37, blade: '#e8ecff', edge: '#ffffff', tsuba: '#2a2a5a', wrap: '#0a0a24', glow: '#ffe8a0', forged: true, el: 'spirit', lore: 'Moon Shadow. Shadow lords cannot hide from its light.' },
  { id: 'hyoryu', name: 'Hyōryū', r: 'legendary', dmg: 42, blade: '#aef0ff', edge: '#ffffff', tsuba: '#1a4a7a', wrap: '#06142a', glow: '#5fe0ff', forged: true, el: 'frost', lore: 'The Ice Dragon. Forged to tame fire and dragon alike.' },
  { id: 'kusanagi', name: 'Kusanagi', r: 'mythic', dmg: 58, blade: '#fff4d0', edge: '#ffffff', tsuba: '#c9a030', wrap: '#2a1a00', glow: '#ffffff', forged: true, el: 'all', lore: 'The Grass Cutter. The sword of legends, strong against every foe.' },
);
const ELEMENTS = {
  fire: { n: 'Fire', i: '🔥', c: '#ff7a3a' }, frost: { n: 'Frost', i: '❄', c: '#9fe8ff' },
  shadow: { n: 'Shadow', i: '☾', c: '#b48aff' }, spirit: { n: 'Spirit', i: '✦', c: '#ffe08c' }, all: { n: 'Divine', i: '✺', c: '#ffffff' },
};
Object.assign(SWORDS.find(s => s.id === 'ember'), { el: 'fire' });
Object.assign(SWORDS.find(s => s.id === 'moon'), { el: 'frost' });
Object.assign(SWORDS.find(s => s.id === 'jade'), { el: 'shadow' });
Object.assign(SWORDS.find(s => s.id === 'sakura'), { el: 'spirit' });
Object.assign(SWORDS.find(s => s.id === 'dragon'), { el: 'fire' });
Object.assign(SWORDS.find(s => s.id === 'void'), { el: 'shadow' });
Object.assign(SWORDS.find(s => s.id === 'ogre'), { el: 'fire' });
Object.assign(SWORDS.find(s => s.id === 'frost'), { el: 'frost' });
Object.assign(SWORDS.find(s => s.id === 'tengu'), { el: 'shadow' });
Object.assign(SWORDS.find(s => s.id === 'ryujin'), { el: 'fire' });
const MATERIALS = {
  ironsand:     { n: 'Iron Sand', land: 0, r: 'common', c: '#6a6a78', fx: { dmg: .04 }, d: '+4% damage' },
  charcoal:     { n: 'Bamboo Charcoal', land: 0, r: 'common', c: '#ff8a3a', fx: { el: 'fire' }, d: 'Fire element' },
  sakura:       { n: 'Sakura Spirit', land: 0, r: 'rare', c: '#ff9ec4', fx: { el: 'spirit', dmg: .02 }, d: 'Spirit element, +2% damage' },
  pineresin:    { n: 'Snow Pine Resin', land: 1, r: 'common', c: '#e0b25a', fx: { guard: .04 }, d: 'Stronger blocks' },
  frostcrystal: { n: 'Frost Crystal', land: 1, r: 'uncommon', c: '#9fe8ff', fx: { el: 'frost' }, d: 'Frost element' },
  stariron:     { n: 'Star Iron', land: 1, r: 'rare', c: '#c3d2ff', fx: { dmg: .08 }, d: '+8% damage' },
  lacquer:      { n: 'Red Lacquer', land: 2, r: 'common', c: '#e04a3a', fx: { crit: .03 }, d: '+3% critical hits' },
  obsidian:     { n: 'Shadow Obsidian', land: 2, r: 'uncommon', c: '#8a6ad0', fx: { el: 'shadow' }, d: 'Shadow element' },
  moonsilver:   { n: 'Moonsilver', land: 2, r: 'rare', c: '#eef0ff', fx: { el: 'spirit', dmg: .05 }, d: 'Spirit element, +5% damage' },
  dragonscale:  { n: 'Dragon Scale', land: 3, r: 'uncommon', c: '#ff5a2a', fx: { el: 'fire', dmg: .04 }, d: 'Fire element, +4% damage' },
  embercore:    { n: 'Ember Core', land: 3, r: 'rare', c: '#ffc23a', fx: { dmg: .1 }, d: '+10% damage' },
  phoenixash:   { n: 'Phoenix Ash', land: 3, r: 'epic', c: '#ff6fd0', fx: { crit: .06, spirit: .25 }, d: '+6% crits, faster Spirit Strike' },
  cedar:        { n: 'Cedar Heartwood', land: 4, r: 'common', c: '#b07a4a', fx: { guard: .05 }, d: 'Much stronger blocks' },
  foxfire:      { n: 'Foxfire Ember', land: 4, r: 'uncommon', c: '#7affd8', fx: { el: 'fire', crit: .02 }, d: 'Fire element, +2% crits' },
  weepingpetal: { n: 'Weeping Cherry Petal', land: 4, r: 'rare', c: '#ffb8e0', fx: { el: 'spirit', dmg: .06 }, d: 'Spirit element, +6% damage' },
  goldleaf:     { n: 'Gold Leaf', land: 5, r: 'common', c: '#ffd84a', fx: { dmg: .06 }, d: '+6% damage' },
  stormglass:   { n: 'Storm Glass', land: 5, r: 'uncommon', c: '#9ab8ff', fx: { crit: .05 }, d: '+5% critical hits' },
  drumskin:     { n: 'Thunder Drumskin', land: 5, r: 'rare', c: '#fff27a', fx: { dmg: .06, crit: .03 }, d: '+6% damage, +3% crits' },
  imperialjade: { n: 'Imperial Jade', land: 6, r: 'common', c: '#5affa8', fx: { guard: .06 }, d: 'The strongest blocks' },
  moatpearl:    { n: 'Moat Pearl', land: 6, r: 'uncommon', c: '#f4f0ff', fx: { spirit: .2 }, d: 'Spirit Strike charges faster' },
  chrysanthemum:{ n: 'Chrysanthemum Seal', land: 6, r: 'epic', c: '#ffcf3a', fx: { dmg: .08, crit: .04 }, d: '+8% damage, +4% crits' },
};
const MAT_IDS = Object.keys(MATERIALS);
const RECIPES_MORE = [
  { id: 'yozakura', base: 'shidare', mats: { weepingpetal: 3, cedar: 3, foxfire: 2, sakura: 2 }, tip: 'Spirit blade of the night cherries. Strong against the fox spirit\'s land.' },
  { id: 'raiden', base: 'ikazuchi', mats: { stormglass: 4, drumskin: 2, goldleaf: 3, frostcrystal: 2 }, tip: 'Lightning in a blade. Its critical hits crackle.' },
  { id: 'amaterasu', base: 'kusanagi', mats: { chrysanthemum: 2, imperialjade: 3, moatpearl: 3, drumskin: 2, weepingpetal: 2 }, sharpen: true, tip: 'The sun goddess\'s blade. Beats every element. The final sword, made for Orochi.' },
];
const RECIPES = [
  { id: 'kanemitsu', base: 'iron', mats: { ironsand: 3, charcoal: 2 }, tip: 'A strong early blade with sharp critical hits.' },
  { id: 'kagaribi', base: 'crane', mats: { charcoal: 4, ironsand: 3, pineresin: 2 }, tip: 'Fire beats the frost warriors and the Frost Giant.' },
  { id: 'tsukikage', base: 'moon', mats: { sakura: 2, moonsilver: 2, stariron: 2, lacquer: 2 }, tip: 'Spirit beats the shadow warriors, Lord Kuro and the Tengu King.' },
  { id: 'hyoryu', base: 'storm', mats: { frostcrystal: 4, stariron: 2, obsidian: 2, dragonscale: 2 }, tip: 'Frost beats the fire oni, the Dragon Shogun and the Sky Dragon.' },
  { id: 'kusanagi', base: 'void', mats: { sakura: 3, frostcrystal: 3, moonsilver: 3, embercore: 3, phoenixash: 2 }, sharpen: true, tip: 'The legendary blade. Strong against every foe. Must be sharpened by hand.' },
];
RECIPES.push(...RECIPES_MORE);
const CLUB_DEF = { id: 'kanabo', name: 'Iron Kanabo', r: 'rare', dmg: 0, blade: '#3a3a40', edge: '#8a8a94', tsuba: '#2a1a12', wrap: '#4a2a1a', club: true };

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

OUTFITS.push(
  { id: 'cherrygeneral', name: 'Cherry General', cloth: '#120a0e', armor: '#26202a', trim: '#ff9ac8', helm: 'kabuto', helmCol: '#1a141c', crest: 'flower', crestCol: '#ff9ac8', eye: '#ffd0e8', aura: '#ff9ac8', hp: 75, dmg: 0.14, how: { boss: 18 }, desc: 'Black lacquer and falling cherry petals.' },
  { id: 'goldenwarlord', name: 'Golden Warlord', cloth: '#2a0a0a', armor: '#e0aa35', trim: '#c0281e', helm: 'kabuto', helmCol: '#c8901f', crest: 'sun', crestCol: '#ffe27a', eye: '#ff5a3a', banner: '#c0281e', aura: '#ffc23a', hp: 90, dmg: 0.16, how: { boss: 22 }, desc: 'Gold armor from the seven-story tower.' },
  { id: 'imperialshogun', name: 'Imperial Shogun', cloth: '#1a0a2a', armor: '#2a1a4a', trim: '#ffd84a', helm: 'kabuto', helmCol: '#120a22', crest: 'dragon', crestCol: '#ffd84a', eye: '#d8b8ff', banner: '#4a2a8a', aura: '#b88aff', hp: 110, dmg: 0.2, how: { boss: 26 }, desc: 'The armor of the ruler of all the lands.' },
);
const CHAPTERS = [
  { name: 'Bamboo Village', jp: '竹の村', blurb: 'Sunset over the bamboo groves.' },
  { name: 'Frozen Pass', jp: '氷の峠', blurb: 'Snow, pines and dancing northern lights.' },
  { name: 'Shadow Castle', jp: '影の城', blurb: 'Lanterns glow under a purple moon.' },
  { name: 'Dragon Peak', jp: '龍の峰', blurb: 'Lava rivers, and a dragon in the sky.' },
  { name: 'Kakunodate', jp: '角館', blurb: 'A woodland samurai village of black fences and weeping cherries.' },
  { name: 'Azuchi Castle', jp: '安土城', blurb: 'A golden seven-story castle above a stormy lake.' },
  { name: 'Imperial Palace', jp: '皇居', blurb: 'Moats, white walls and the lights of Tokyo at night.' },
];
const NL = CHAPTERS.length;

const STAGES = [
  { ch: 0, name: 'Kenji', title: 'the Bamboo Bandit', hp: 120, dmg: 9, tele: 1400, guard: .12, react: .12, combo: .05, feint: 0, low: 0, sword: 'rusty', gold: 60, steel: 4,
    look: { cloth: '#4a3a2a', armor: '#6d5a43', trim: '#c0452f', helm: 'band', helmCol: '#c0452f', crest: null, eye: '#ffcf8a' } },
  { ch: 0, name: 'Taro', title: 'the Lone Ronin', hp: 170, dmg: 11, tele: 1300, guard: .18, react: .18, combo: .12, feint: 0, low: .05, sword: 'iron', gold: 80, steel: 5,
    look: { cloth: '#283044', armor: '#4b5563', trim: '#d1c7a3', helm: 'kasa', helmCol: '#a8854a', crest: null, eye: '#ffe9a8' } },
  { ch: 0, boss: 1, breakAt: 10, name: 'Captain Haru', title: 'the Crimson Fang', hp: 280, dmg: 14, tele: 1180, guard: .24, react: .22, combo: .2, feint: .05, low: .1, sword: 'river', gold: 150, steel: 10, outfit: 'crimson',
    look: { cloth: '#3b1a16', armor: '#9c2f24', trim: '#e8b54a', helm: 'kabuto', helmCol: '#6e1f19', crest: 'horns', crestCol: '#e8b54a', eye: '#ff8a5a', banner: '#9c2f24' } },
  { ch: 1, name: 'Brother Gen', title: 'the Mountain Monk', hp: 340, dmg: 17, tele: 1080, guard: .26, react: .26, combo: .2, feint: .05, low: .15, sword: 'crane', gold: 140, steel: 9,
    look: { cloth: '#e6dcc6', armor: '#b58a52', trim: '#8a3324', helm: 'band', helmCol: '#8a3324', crest: null, eye: '#9fe0ff' } },
  { ch: 1, name: 'Sora', title: 'the Ice Ronin', hp: 400, dmg: 19, tele: 1000, guard: .28, react: .3, combo: .25, feint: .1, low: .15, sword: 'moon', gold: 160, steel: 10,
    look: { cloth: '#2e425c', armor: '#8fb0cf', trim: '#ffffff', helm: 'hood', helmCol: '#3d5675', crest: null, eye: '#bfe9ff', scarf: '#bfe9ff' } },
  { ch: 1, boss: 1, breakAt: 17, name: 'Yuki', title: 'the Frost Blade', hp: 560, dmg: 23, tele: 940, guard: .32, react: .32, combo: .3, feint: .15, low: .2, sword: 'ember', gold: 240, steel: 16, outfit: 'snow',
    look: { cloth: '#34557a', armor: '#e5eef8', trim: '#5fb0ff', helm: 'kabuto', helmCol: '#d8e6f4', crest: 'moon', crestCol: '#8fd0ff', eye: '#7fe8ff', banner: '#5fb0ff', aura: '#9fe6ff' } },
  { ch: 2, name: 'Shadow Guard', title: 'of Kuro Castle', hp: 640, dmg: 26, tele: 880, guard: .34, react: .36, combo: .3, feint: .2, low: .2, sword: 'storm', gold: 200, steel: 13,
    look: { cloth: '#191822', armor: '#2c2a3a', trim: '#7f70b8', helm: 'kabuto', helmCol: '#22202e', crest: null, eye: '#c9a0ff' } },
  { ch: 2, name: 'Rei', title: 'the Twin Fang Ninja', hp: 720, dmg: 28, tele: 830, guard: .36, react: .4, combo: .38, feint: .3, low: .25, sword: 'jade', gold: 230, steel: 14,
    look: { cloth: '#121218', armor: '#1f1f27', trim: '#d23a3a', helm: 'hood', helmCol: '#15151c', crest: null, eye: '#ff6b6b', scarf: '#d23a3a' } },
  { ch: 2, boss: 1, breakAt: 25, name: 'Lord Kuro', title: 'the Shadow Lord', hp: 950, dmg: 33, tele: 780, guard: .4, react: .42, combo: .42, feint: .3, low: .3, sword: 'sakura', gold: 360, steel: 22, outfit: 'golden',
    look: { cloth: '#241a33', armor: '#15141a', trim: '#d9b13d', helm: 'kabuto', helmCol: '#0e0d12', crest: 'horns', crestCol: '#d9b13d', eye: '#ffd24a', banner: '#5a2a8a', aura: '#8a5aff' } },
  { ch: 3, name: 'Temple Sentinel', title: 'Guardian of the Gate', hp: 1050, dmg: 36, tele: 740, guard: .42, react: .45, combo: .4, feint: .3, low: .3, sword: 'oni', gold: 300, steel: 20,
    look: { cloth: '#2d3323', armor: '#5f6e48', trim: '#e0c77a', helm: 'kabuto', helmCol: '#4a5839', crest: 'oni', crestCol: '#e0c77a', eye: '#baff8a' } },
  { ch: 3, name: 'Goro', title: 'the Fire Oni', hp: 1200, dmg: 40, tele: 700, guard: .42, react: .48, combo: .45, feint: .35, low: .3, sword: 'dragon', gold: 340, steel: 22,
    look: { cloth: '#2a0d08', armor: '#8f1d12', trim: '#ffa01a', helm: 'kabuto', helmCol: '#5c0f0a', crest: 'oni', crestCol: '#ffa01a', eye: '#ffd23a', aura: '#ff6a1a' } },
  { ch: 3, boss: 1, breakAt: 33, name: 'The Dragon Shogun', title: 'Master of Dragon Peak', hp: 1550, dmg: 46, tele: 650, guard: .46, react: .5, combo: .55, feint: .4, low: .35, sword: 'void', gold: 600, steel: 36, outfit: 'dragonlord',
    look: { cloth: '#3b0d12', armor: '#1c1e2a', trim: '#ffae1a', helm: 'kabuto', helmCol: '#12131b', crest: 'dragon', crestCol: '#ffae1a', eye: '#e08bff', banner: '#ff7a1a', aura: '#c35cff' } },
];

/* Mythical bosses: one behind each chapter's spirit gate. */
const MYTHS = [
  { ch: 0, myth: true, breakAt: 13, name: 'Akaoni', title: 'the Mountain Ogre', hp: 560, dmg: 22, tele: 1300, guard: .1, react: .15, combo: .25, feint: 0, low: .15, fury: .3, scale: 1.75, weapon: 'club', sword: 'ogre', gold: 320, steel: 24,
    intro: 'A giant red ogre with an iron club. Its red-ring smash cannot be parried. Hold BLOCK!',
    look: { cloth: '#3a1a10', armor: '#c8321e', trim: '#2a1a12', helm: 'band', helmCol: '#2a1a12', crest: 'oni', crestCol: '#f2e6c8', eye: '#ffe24a', mask: '#b8281a', skin: '#c8321e', aura: '#ff5a2a' } },
  { ch: 1, myth: true, breakAt: 21, name: 'Hyōga', title: 'the Frost Giant', hp: 1050, dmg: 30, tele: 1150, guard: .2, react: .25, combo: .3, feint: .1, low: .25, fury: .3, freeze: true, scale: 1.9, weapon: 'frost', sword: 'frost', gold: 480, steel: 34,
    intro: 'Its icy hits freeze your arms and slow your swings. Block the red ring!',
    look: { cloth: '#5a7ea8', armor: '#d9f2ff', trim: '#7fe8ff', helm: 'kabuto', helmCol: '#bfe9ff', crest: 'crystal', crestCol: '#9ff2ff', eye: '#4ad8ff', mask: '#9fcfe8', aura: '#bff4ff' } },
  { ch: 2, myth: true, breakAt: 29, name: 'Sōjōbō', title: 'King of the Tengu', hp: 1400, dmg: 34, tele: 760, guard: .3, react: .45, combo: .45, feint: .4, low: .25, fury: .2, teleport: .4, scale: 1.25, weapon: 'tengu', sword: 'tengu', gold: 640, steel: 44,
    intro: 'The Tengu King vanishes in a puff of feathers and strikes from a new spot. Stay sharp!',
    look: { cloth: '#1a1a22', armor: '#2a2230', trim: '#ffb03a', helm: 'tengu', helmCol: '#c0281e', crest: null, eye: '#ffd24a', mask: '#c0281e', wings: '#15151c', aura: '#ffb03a' } },
  { ch: 3, myth: true, dragon: true, breakAt: 38, name: 'Ryūjin', title: 'the Sky Dragon', hp: 2400, dmg: 46, tele: 820, guard: .25, react: .3, combo: .45, feint: .3, low: .3, fury: .3, sword: 'ryujin', gold: 1200, steel: 80,
    intro: 'The dragon itself descends! Parry its bites and claws, block its fire breath, and chop off its horns and claws.',
    look: { aura: '#ffb03a' } },
];
/* The 4th warrior of each land waits between the 2nd warrior and the boss. Only trained samurai may challenge them.
   From land 3 on it is either the 2nd warrior leveled up, or a 2-on-1 against two of them. (Appended so old saves keep their records.) */
STAGES.forEach(st => { st.ord = st.boss ? 3 : STAGES.filter(o => o.ch === st.ch && !o.boss).indexOf(st); });
STAGES.push(
  { ch: 0, ord: 2, train: { sk: 'power', l: 3 }, name: 'Masaru', title: 'the Dojo Rival', hp: 240, dmg: 12, tele: 1220, guard: .34, react: .26, combo: .16, feint: .05, low: .05, sword: 'rival', gold: 110, steel: 7,
    look: { cloth: '#1f3a2a', armor: '#2f5a3c', trim: '#e8d27a', helm: 'band', helmCol: '#e8d27a', crest: null, eye: '#c8ff9a', scarf: '#e8d27a' } },
  { ch: 1, ord: 2, train: { sk: 'guard', l: 4 }, name: 'Kaede', title: 'the Winter Blade', hp: 480, dmg: 21, tele: 960, guard: .3, react: .34, combo: .28, feint: .12, low: .2, sword: 'hailstone', gold: 200, steel: 13,
    look: { cloth: '#4a2a5a', armor: '#d9cfee', trim: '#9fd4ff', helm: 'kabuto', helmCol: '#cfc4e8', crest: 'moon', crestCol: '#9fd4ff', eye: '#d9b8ff', scarf: '#9fd4ff' } },
  { ch: 2, ord: 2, train: { sk: 'speed', l: 5 }, leveled: 7, name: 'Rei Unleashed', title: 'the Twin Fang, leveled up', hp: 980, dmg: 31, tele: 740, guard: .38, react: .48, combo: .46, feint: .36, low: .28, sword: 'kagemaru', gold: 300, steel: 18,
    look: { cloth: '#121218', armor: '#2a0f12', trim: '#ff4a4a', helm: 'hood', helmCol: '#1a0a0c', crest: null, eye: '#fff0f0', scarf: '#ff4a4a', aura: '#ff3a3a' } },
  { ch: 3, ord: 2, train: { sk: 'vital', l: 6 }, duo: true, name: 'The Oni Brothers', title: 'Goro and his twin, two at once', hp: 1200, dmg: 40, tele: 700, guard: .42, react: .48, combo: .45, feint: .35, low: .3, sword: 'twinflame', gold: 520, steel: 30,
    look: { cloth: '#2a0d08', armor: '#8f1d12', trim: '#ffa01a', helm: 'kabuto', helmCol: '#5c0f0a', crest: 'oni', crestCol: '#ffa01a', eye: '#ffd23a', aura: '#ff6a1a' },
    look2: { cloth: '#0a1a2a', armor: '#1d4a8f', trim: '#7ad8ff', helm: 'kabuto', helmCol: '#0f2a5c', crest: 'oni', crestCol: '#7ad8ff', eye: '#bff4ff', aura: '#4ab8ff' } },
);
STAGES.push(
  { ch: 4, ord: 0, name: 'Hayato', title: 'the Cedar Scout', hp: 1700, dmg: 48, tele: 640, guard: .42, react: .48, combo: .45, feint: .35, low: .3, sword: 'cedarfang', gold: 380, steel: 24,
    look: { cloth: '#2a3a1e', armor: '#5a4a2a', trim: '#c9a86a', helm: 'kasa', helmCol: '#8a6a3a', crest: null, eye: '#d8ff9a', scarf: '#6a8a3a' } },
  { ch: 4, ord: 1, name: 'Sakurako', title: 'Blade of the Weeping Cherries', hp: 1900, dmg: 50, tele: 620, guard: .44, react: .5, combo: .48, feint: .38, low: .3, sword: 'shidare', gold: 420, steel: 26,
    look: { cloth: '#5a1a3a', armor: '#f0b8d0', trim: '#2a0a1a', helm: 'band', helmCol: '#ff9ac8', crest: null, eye: '#ffd0e8', scarf: '#ff9ac8' } },
  { ch: 4, ord: 3, boss: 1, breakAt: 50, name: 'General Shidare', title: 'of the Black Fences', hp: 2700, dmg: 58, tele: 560, guard: .48, react: .54, combo: .55, feint: .42, low: .35, sword: 'kakunodate', gold: 720, steel: 44, outfit: 'cherrygeneral',
    look: { cloth: '#120a0e', armor: '#26202a', trim: '#ff9ac8', helm: 'kabuto', helmCol: '#1a141c', crest: 'flower', crestCol: '#ff9ac8', eye: '#ffd0e8', banner: '#26202a', aura: '#ff9ac8' } },
  { ch: 4, ord: 2, train: { sk: 'iai', l: 7 }, leveled: 17, name: 'Sakurako Unbound', title: 'leveled up after a winter of training', hp: 2400, dmg: 54, tele: 580, guard: .46, react: .56, combo: .52, feint: .42, low: .32, sword: 'shidaremk2', gold: 560, steel: 34,
    look: { cloth: '#3a0a22', armor: '#ff9ac8', trim: '#ffffff', helm: 'band', helmCol: '#ffffff', crest: null, eye: '#ffffff', scarf: '#ffffff', aura: '#ff6ab0' } },
  { ch: 5, ord: 0, name: 'Kenta', title: 'Guard of the Stone Walls', hp: 2900, dmg: 60, tele: 550, guard: .5, react: .54, combo: .5, feint: .4, low: .32, sword: 'ishigaki', gold: 600, steel: 36,
    look: { cloth: '#3a3026', armor: '#7a6a54', trim: '#e0c070', helm: 'kabuto', helmCol: '#5a4a3a', crest: null, eye: '#ffe0a0' } },
  { ch: 5, ord: 1, name: 'Ikazuchi', title: 'the Storm Lancer', hp: 3100, dmg: 62, tele: 530, guard: .48, react: .56, combo: .55, feint: .42, low: .35, sword: 'ikazuchi', gold: 650, steel: 38,
    look: { cloth: '#0e1430', armor: '#2a3a7a', trim: '#fff27a', helm: 'kabuto', helmCol: '#1a2450', crest: 'moon', crestCol: '#fff27a', eye: '#fff7b0', aura: '#8ab8ff' } },
  { ch: 5, ord: 3, boss: 1, breakAt: 64, name: 'The Golden Warlord', title: 'Master of Azuchi Castle', hp: 4000, dmg: 68, tele: 500, guard: .52, react: .6, combo: .6, feint: .45, low: .38, sword: 'goldenwarlord', gold: 1000, steel: 60, outfit: 'goldenwarlord',
    look: { cloth: '#2a0a0a', armor: '#e0aa35', trim: '#c0281e', helm: 'kabuto', helmCol: '#c8901f', crest: 'sun', crestCol: '#ffe27a', eye: '#ff5a3a', banner: '#c0281e', aura: '#ffc23a' } },
  { ch: 5, ord: 2, train: { sk: 'power', l: 8 }, duo: true, name: 'The Storm Twins', title: 'two Ikazuchi at once', hp: 3100, dmg: 62, tele: 530, guard: .48, react: .56, combo: .55, feint: .42, low: .35, sword: 'stormtwins', gold: 900, steel: 52,
    look: { cloth: '#0e1430', armor: '#2a3a7a', trim: '#fff27a', helm: 'kabuto', helmCol: '#1a2450', crest: 'moon', crestCol: '#fff27a', eye: '#fff7b0', aura: '#8ab8ff' },
    look2: { cloth: '#2a2a0a', armor: '#8a7a1a', trim: '#8ab8ff', helm: 'kabuto', helmCol: '#4a420e', crest: 'moon', crestCol: '#8ab8ff', eye: '#cfe0ff', aura: '#fff27a' } },
  { ch: 6, ord: 0, name: 'Isamu', title: 'of the Palace Guard', hp: 4200, dmg: 70, tele: 490, guard: .52, react: .58, combo: .55, feint: .45, low: .38, sword: 'nijubashi', gold: 900, steel: 54,
    look: { cloth: '#1a1a2a', armor: '#e8ecf4', trim: '#4a6aa8', helm: 'kabuto', helmCol: '#d8dce8', crest: null, eye: '#bfe8ff' } },
  { ch: 6, ord: 1, name: 'Kirin', title: 'the Imperial Blade', hp: 4500, dmg: 72, tele: 470, guard: .54, react: .6, combo: .58, feint: .48, low: .38, sword: 'kirin', gold: 980, steel: 58,
    look: { cloth: '#1a3a2a', armor: '#f0e0b0', trim: '#ffd84a', helm: 'kabuto', helmCol: '#e8d8a0', crest: 'sun', crestCol: '#ffd84a', eye: '#fff2b0', scarf: '#ffd84a' } },
  { ch: 6, ord: 3, boss: 1, breakAt: 82, name: 'The Eternal Shogun', title: 'Lord of the Imperial Palace', hp: 6500, dmg: 84, tele: 420, guard: .58, react: .65, combo: .65, feint: .5, low: .4, sword: 'eternal', gold: 1600, steel: 90, outfit: 'imperialshogun',
    look: { cloth: '#1a0a2a', armor: '#2a1a4a', trim: '#ffd84a', helm: 'kabuto', helmCol: '#120a22', crest: 'dragon', crestCol: '#ffd84a', eye: '#d8b8ff', banner: '#4a2a8a', aura: '#b88aff' } },
  { ch: 6, ord: 2, train: { sk: 'guard', l: 9 }, leveled: 25, name: 'Kirin Ascended', title: 'the Imperial Blade, leveled up', hp: 5600, dmg: 78, tele: 440, guard: .56, react: .64, combo: .62, feint: .5, low: .4, sword: 'kirinmk2', gold: 1200, steel: 70,
    look: { cloth: '#0a2a1a', armor: '#fff4d0', trim: '#ffffff', helm: 'kabuto', helmCol: '#fff0c0', crest: 'sun', crestCol: '#ffffff', eye: '#ffffff', scarf: '#ffffff', aura: '#fff2b0' } },
);
[[16, 'fire', 'frost'], [17, 'fire', 'frost'], [18, 'fire', 'spirit'], [19, 'fire', 'frost'], [20, 'frost', 'fire'], [21, 'shadow', 'spirit'], [22, 'frost', 'fire'], [23, 'shadow', 'spirit'], [24, 'spirit', 'shadow'], [25, 'shadow', 'spirit'], [26, 'spirit', 'shadow'], [27, 'shadow', 'spirit']]
  .forEach(([i, w, r]) => Object.assign(STAGES[i], { weak: w, resist: r }));
Object.assign(STAGES[13], { weak: 'fire', resist: 'frost' }); Object.assign(STAGES[14], { weak: 'spirit', resist: 'shadow' }); Object.assign(STAGES[15], { weak: 'frost', resist: 'fire' });
for (const s of STAGES.concat(MYTHS)) s.rec = Math.round(Math.sqrt(s.hp * (s.duo ? 1.5 : 1) * s.dmg) / 3.2);
/* weaknesses: the right element hits much harder */
[[2, 'frost', 'fire'], [3, 'fire'], [4, 'fire', 'frost'], [5, 'fire', 'frost'], [6, 'spirit', 'shadow'], [7, 'spirit', 'shadow'], [8, 'spirit', 'shadow'], [9, 'frost'], [10, 'frost', 'fire'], [11, 'frost', 'fire']]
  .forEach(([i, w, r]) => { STAGES[i].weak = w; if (r) STAGES[i].resist = r; });
Object.assign(MYTHS[0], { weak: 'spirit', resist: 'fire' }); Object.assign(MYTHS[1], { weak: 'fire', resist: 'frost' });
Object.assign(MYTHS[2], { weak: 'spirit', resist: 'shadow' }); Object.assign(MYTHS[3], { weak: 'frost', resist: 'fire' });
MYTHS.push(
  { ch: 4, myth: true, breakAt: 58, name: 'Kyūbi', title: 'the Nine-Tailed Fox', hp: 3200, dmg: 56, tele: 660, guard: .3, react: .5, combo: .5, feint: .45, low: .3, fury: .3, teleport: .35, scale: 1.55, weapon: 'kitsunebi', sword: 'kitsunebi', gold: 1400, steel: 90,
    intro: 'The fox spirit vanishes in foxfire and strikes from a new spot. Its red-ring foxfire blast cannot be parried!',
    look: { cloth: '#f4ece0', armor: '#ffffff', trim: '#c0281e', helm: 'kitsune', helmCol: '#fff8f0', crest: null, eye: '#7affd8', mask: '#ffffff', tails: '#fff4e8', tailTip: '#7affd8', aura: '#7affd8' } },
  { ch: 5, myth: true, breakAt: 72, name: 'Raijin', title: 'God of Thunder', hp: 4600, dmg: 66, tele: 720, guard: .25, react: .4, combo: .5, feint: .3, low: .3, fury: .35, shock: true, scale: 1.9, weapon: 'club', sword: 'raikiri', gold: 1800, steel: 110,
    intro: 'Raijin beats his thunder drums. His lightning shocks your arms and slows your swings. Block the red ring!',
    look: { cloth: '#1a2a1a', armor: '#3a8a5a', trim: '#ffd84a', helm: 'band', helmCol: '#ffd84a', crest: 'oni', crestCol: '#ffd84a', eye: '#fff27a', mask: '#2a7a4a', skin: '#3a8a5a', drums: '#c0281e', aura: '#fff27a' } },
  { ch: 6, myth: true, dragon: true, orochi: true, breakAt: 90, name: 'Yamata no Orochi', title: 'the Eight-Headed Serpent', hp: 8000, dmg: 80, tele: 700, guard: .25, react: .35, combo: .5, feint: .35, low: .3, fury: .3, sword: 'orochi', gold: 3000, steel: 160,
    intro: 'Eight heads and eight tails! Parry its bites, block its red-ring fire, and chop off its heads.',
    look: { aura: '#6aff8a' } },
);
for (const s of MYTHS.slice(4)) s.rec = Math.round(Math.sqrt(s.hp * s.dmg) / 3.2);
Object.assign(MYTHS[4], { weak: 'frost', resist: 'fire' }); Object.assign(MYTHS[5], { weak: 'shadow', resist: 'spirit' }); Object.assign(MYTHS[6], { weak: 'spirit', resist: 'fire' });
/* The final fight of each land: the beast reborn as a Spirit Warrior. It keeps the beast's trick and moves about 12% faster. */
const SPIRIT_LOOKS = [
  { cloth: '#3a1a10', armor: '#c8321e', trim: '#ffcf4a', helm: 'kabuto', helmCol: '#8a1d12', crest: 'oni', crestCol: '#f2e6c8', eye: '#ffe24a', mask: '#b8281a', aura: '#ff5a2a', scarf: '#ff7a3a' },
  { cloth: '#5a7ea8', armor: '#d9f2ff', trim: '#7fe8ff', helm: 'kabuto', helmCol: '#bfe9ff', crest: 'crystal', crestCol: '#9ff2ff', eye: '#4ad8ff', mask: '#9fcfe8', aura: '#bff4ff', scarf: '#bff4ff' },
  { cloth: '#1a1a22', armor: '#2a2230', trim: '#ffb03a', helm: 'tengu', helmCol: '#c0281e', crest: null, eye: '#ffd24a', mask: '#c0281e', wings: '#15151c', aura: '#ffb03a' },
  { cloth: '#3b0d12', armor: '#d2301a', trim: '#ffc24a', helm: 'kabuto', helmCol: '#7a120a', crest: 'dragon', crestCol: '#ffc24a', eye: '#ffe27a', mask: '#7a120a', aura: '#ffb03a', scarf: '#ffb03a' },
  { cloth: '#f4ece0', armor: '#ffffff', trim: '#c0281e', helm: 'kitsune', helmCol: '#fff8f0', crest: null, eye: '#7affd8', mask: '#ffffff', tails: '#fff4e8', tailTip: '#7affd8', aura: '#7affd8' },
  { cloth: '#1a2a1a', armor: '#3a8a5a', trim: '#ffd84a', helm: 'kabuto', helmCol: '#1a4a2a', crest: 'oni', crestCol: '#ffd84a', eye: '#fff27a', mask: '#2a7a4a', drums: '#c0281e', aura: '#fff27a', scarf: '#fff27a' },
  { cloth: '#0a1a0a', armor: '#2a6a3a', trim: '#b8ffb0', helm: 'kabuto', helmCol: '#1a3a1a', crest: 'dragon', crestCol: '#b8ffb0', eye: '#6aff8a', mask: '#1a4a2a', aura: '#6aff8a', scarf: '#6aff8a' },
];
const SPIRIT_TRICKS = [
  'It still swings like the ogre: its red-ring smash cannot be parried. Hold BLOCK!',
  'Its icy blade freezes your arms. Block the red ring and strike while it recovers.',
  'It vanishes and reappears like the Tengu King. Watch for the puff of feathers!',
  'Dragon fire burns in its blade. Block the red ring, then strike fast.',
  'It vanishes in foxfire like the Nine-Tailed Fox. Watch for the green flames!',
  'Thunder crackles in its blade. Its hits shock your arms and slow your swings.',
  'It strikes like eight serpents at once. Its combos come fast, so parry and stay calm.',
];
const SPIRITS = MYTHS.map((m, ch) => {
  const boss = STAGES.find(s => s.ch === ch && s.boss), fast = .88;
  return Object.assign({}, m, {
    spirit: true, myth: true, dragon: false, ch, title: 'Spirit Warrior', scale: 1.12, weapon: m.sword,
    hp: Math.round(m.hp * 1.1), dmg: Math.round(m.dmg * 1.05),
    tele: Math.round(Math.min(m.tele, boss.tele) * fast), spd: 1.12,
    react: Math.min(.75, Math.max(m.react, boss.react) * 1.12), combo: Math.max(m.combo, boss.combo), feint: Math.max(m.feint, boss.feint),
    guard: Math.max(m.guard, boss.guard * .9), fury: m.fury || .3, teleport: m.teleport, freeze: m.freeze,
    breakAt: m.breakAt + 2, look: SPIRIT_LOOKS[ch], intro: SPIRIT_TRICKS[ch],
  });
});
for (const s of SPIRITS) s.rec = Math.round(Math.sqrt(s.hp * s.dmg) / 3.2);

const ORB_COLS = ['#ff9ec4', '#7fe8ff', '#c9a0ff', '#ffb03a', '#7affd8', '#fff27a', '#ffd84a'];
const PUZZLES = ['lanterns', 'seals', 'moonpath', 'scales', 'lanterns', 'seals', 'moonpath'];
const PUZZLE_NAMES = ['The Lantern Song', 'The Frozen Seals', 'The Moon Path', 'The Dragon Scales', 'The Fox Lanterns', 'The Thunder Seals', 'The Imperial Path'];

const SKILLS = {
  power: { n: 'Power', g: '力', d: 'More damage with every slash' },
  speed: { n: 'Speed', g: '速', d: 'Slash again sooner' },
  guard: { n: 'Guard', g: '守', d: 'Easier parries and stronger blocks' },
  vital: { n: 'Vitality', g: '命', d: 'More health in battle' },
  iai: { n: 'Iai', g: '抜', d: 'Faster draws and more time against ghosts' },
};

const TRAININGS = {
  bamboo: { name: 'Bamboo Cutting', skill: 'power', g: '力', desc: 'Bamboo shoots up from the floor. Slice through as many as you can in 30 seconds. Avoid the stone pillars!' },
  reflex: { name: 'Lightning Reflex', skill: 'speed', g: '速', desc: 'Swipe the way the arrow points before the circle closes. It gets faster!' },
  parry: { name: 'Sensei Parry Drill', skill: 'guard', g: '守', desc: 'The sensei swings a practice sword. Swipe through the gold ring right as it flashes.' },
  stance: { name: 'Lantern Focus', skill: 'vital', g: '命', desc: 'Keep your finger on the floating lantern. Stay calm and follow it everywhere.' },
  iai: { name: 'Iai Quick Draw', skill: 'iai', g: '抜', desc: 'Wait for the bell, swipe from your hilt to draw, cut the straw target, then slide the blade back into its sheath with one smooth stroke. Targets move at higher levels.' },
};
const GHOST_LOOK = { cloth: '#5a7ab0', armor: '#d9eeff', trim: '#9fe8ff', helm: 'kabuto', helmCol: '#cfe8ff', crest: 'moon', crestCol: '#9fe8ff', eye: '#ffffff', scarf: '#bff4ff', mask: '#9fc4e8' };
const GEISHA_LOOK = { geisha: true, cloth: '#c23a7a', armor: '#c23a7a', trim: '#ffd27a', hem: '#3a1450', mask: '#ffffff', eye: '#ff3f8a', lips: '#e0103a', pins: '#ffd27a', bloom: '#ff9ec4' };
const GEISHA_FAN = { id: 'ghostfan', name: 'Spirit Fan', r: 'rare', dmg: 0, fan: true, blade: '#ffe6f2', edge: '#ff6fb0', tsuba: '#3a1a2a', wrap: '#3a1a2a', glow: '#ff7fd0' };
const GHOST_BLADE = { id: 'ghostblade', name: 'Spirit Blade', r: 'rare', dmg: 0, blade: '#bfefff', edge: '#ffffff', tsuba: '#6a9acc', wrap: '#2a4a7a', glow: '#7fe8ff' };

const DUMMY_LOOK = { cloth: '#6b5233', armor: '#c9a35a', trim: '#7a4a24', helm: 'band', helmCol: '#ffffff', crest: null, eye: '#ffd890' };
const SENSEI_LOOK = { cloth: '#1f2a4a', armor: '#e9e1cc', trim: '#c0392b', helm: 'band', helmCol: '#c0392b', crest: null, eye: '#ffe6a0' };

/* ---------- save ---------- */
const SAVE_KEY = 'shep-katana-legend-3d-v2';
/* ---------- player identity: a dueling code and a wax seal, made once per player ---------- */
const PID_ABC = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function newPid() { let s = ''; for (let i = 0; i < 8; i++) s += PID_ABC[(Math.random() * PID_ABC.length) | 0]; return s; }
function newSealStyle() { return { c: (Math.random() * 7) | 0, m: (Math.random() * 4) | 0, s: (Math.random() * 1e6) | 0 }; }
function fmtPid(p) { return p ? p.slice(0, 4) + '-' + p.slice(4) : ''; }
function freshSave() {
  return {
    gold: 80, steel: 6, cleared: 0, stars: {}, beaten: {}, journey: CHAPTERS.map(() => ({ orbs: [0, 0, 0], puzzle: false, key: false, myth: false })), beastNap: {}, mythStars: {},
    swords: [{ u: 1, id: 'bokken', lvl: 0 }], eq: 1, nu: 2,
    outfits: ['ronin'], outfit: 'ronin',
    sk: { power: { l: 1, x: 0 }, speed: { l: 1, x: 0 }, guard: { l: 1, x: 0 }, vital: { l: 1, x: 0 }, iai: { l: 1, x: 0 } },
    roam: null, captured: [], ghosts: 0, mats: {}, nodeT: {}, forged: [], tutDone: false,
    seen: ['bokken'], sound: true, music: true, quality: 'auto', view: 'fp', wins: 0, parries: 0, name: 'Shep',
    pid: newPid(), seal: newSealStyle(), rivals: [], chal: {}, duels: { w: 0, l: 0 },
  };
}
function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const o = JSON.parse(raw), f = freshSave();
      const merged = Object.assign(f, o);
      merged.sk = Object.assign(freshSave().sk, o.sk || {});
      if (!Array.isArray(merged.journey)) merged.journey = f.journey;
      while (merged.journey.length < NL) merged.journey.push({ orbs: [0, 0, 0], puzzle: false, key: false, myth: false });
      if (!merged.swords || !merged.swords.length) merged.swords = f.swords;
      if (!Array.isArray(merged.captured)) merged.captured = [];
      merged.journey.forEach(j => { if (j.key == null) j.key = !!j.myth; });
      // older versions let ghosts keep stealing blades; keep only the newest theft and give the rest back
      const idOf = c => ((merged.swords || []).find(v => v.u === c.u) || {}).id;
      if (merged.captured.some(c => idOf(c) === 'bokken')) { merged.captured.filter(c => idOf(c) === 'bokken').forEach(c => { const w = merged.swords.find(v => v.u === c.u); if (w) w.captured = false; }); merged.captured = merged.captured.filter(c => idOf(c) !== 'bokken'); }
      if (merged.captured.length > 1) {
        const keep = merged.captured[merged.captured.length - 1];
        merged.captured.slice(0, -1).forEach(c => { const w = (merged.swords || []).find(v => v.u === c.u); if (w) w.captured = false; });
        merged.captured = [keep]; merged.recovered = true;
      }
      (merged.swords || []).forEach(w => { if (w.captured && !merged.captured.some(c => c.u === w.u)) w.captured = false; });
      if (!merged.beastNap) merged.beastNap = {};
      if (!merged.mats || typeof merged.mats !== 'object') merged.mats = {};
      if (!merged.nodeT || typeof merged.nodeT !== 'object') merged.nodeT = {};
      if (o.tutDone == null) merged.tutDone = Object.keys(merged.beaten || {}).length > 0;
      // duel identity for players from before challenges existed
      if (!o.pid) merged.pid = newPid();
      if (!o.seal || typeof o.seal !== 'object') merged.seal = newSealStyle();
      if (!Array.isArray(merged.rivals)) merged.rivals = [];
      if (!merged.chal || typeof merged.chal !== 'object') merged.chal = {};
      if (!merged.duels) merged.duels = { w: 0, l: 0 };
      (merged.swords || []).forEach(w => { if (w.made == null && !w.won && (SWORDS.find(d => d.id === w.id) || {}).forged) w.made = 1; });
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
function isArmed() { const w = S.swords.find(x => x.u === S.eq); return !!w && !w.captured; }
function usableSwords() { return S.swords.filter(w => !w.captured); }
/* A ghost takes the equipped blade; it waits at the spot where it was taken. */
function captureEquipped(ch, x, z) {
  const w = S.swords.find(v => v.u === S.eq); if (!w || w.captured) return null;
  w.captured = true; S.captured.push({ u: w.u, ch, x: +x.toFixed(2), z: +z.toFixed(2) }); save();
  return w;
}
function reclaimSword(entry) {
  const w = S.swords.find(v => v.u === entry.u);
  S.captured = S.captured.filter(c => c !== entry);
  if (w) { w.captured = false; S.eq = w.u; }
  save(); return w;
}
function ensureArmedFallback() {
  if (isArmed()) return null;
  const free = usableSwords().sort((a, b) => swordDmg(b) - swordDmg(a));
  if (free.length) { S.eq = free[0].u; save(); return 'auto'; }
  const w = addSword('bokken'); S.eq = w.u; save();
  return 'loan';
}
function swordFx(w) {
  const d = swordDef(w.id), o = { dmg: 0, crit: d.crit || 0, guard: 0, spirit: 0, el: d.el || null };
  (w.inf || []).forEach(id => { const f = MATERIALS[id] && MATERIALS[id].fx; if (!f) return; o.dmg += f.dmg || 0; o.crit += f.crit || 0; o.guard += f.guard || 0; o.spirit += f.spirit || 0; if (f.el && d.el !== 'all') o.el = f.el; });
  return o;
}
/* bosses snap blades that are too weak for them */
function bladeAtRisk(st, w) { w = w || eqSword(); return !!(st && st.breakAt && w && swordDmg(w) < st.breakAt); }
function breakEquipped(by, ch) {
  const i = S.swords.findIndex(w => w.u === S.eq); if (i < 0) return null;
  const w = S.swords.splice(i, 1)[0];
  S.broken = (S.broken || 0) + 1;
  S.lost = (S.lost || []).concat([{ id: w.id, lvl: w.lvl || 0, by: by || 'a boss', ch: ch || 0 }]).slice(-12);
  const free = usableSwords().sort((a, b) => swordDmg(b) - swordDmg(a));
  let loan = false;
  if (free.length) S.eq = free[0].u; else { const b = addSword('bokken'); S.eq = b.u; loan = true; }
  save();
  return { w, loan, next: eqSword() };
}
function swordDmg(w) { return swordDef(w.id).dmg * (1 + 0.12 * (w.lvl || 0)) * (1 + swordFx(w).dmg) * (w.q || 1); }
function infuseSlots(w) { return 2 + RAR[swordDef(w.id).r].i; }
function matCount(id) { return S.mats[id] || 0; }
function addMat(id, n) { S.mats[id] = (S.mats[id] || 0) + (n || 1); }
function infuse(w, id) {
  if (!matCount(id) || (w.inf || []).length >= infuseSlots(w)) return false;
  S.mats[id]--; (w.inf = w.inf || []).push(id); save(); return true;
}
/* random materials after a win: rarer drops from bosses and beasts */
function rollDrops(ch, kind) {
  const pool = MAT_IDS.filter(id => MATERIALS[id].land === ch), wt = { common: 60, uncommon: 30, rare: 12, epic: 4 };
  const rolls = kind === 'myth' ? 3 : kind === 'boss' ? 2 + (Math.random() < .5) : kind === 'ghost' ? 1 : 1 + (Math.random() < .45);
  const got = {};
  const one = bias => { let tot = 0; pool.forEach(id => tot += wt[MATERIALS[id].r] * (MATERIALS[id].r === 'common' ? 1 : bias)); let r = Math.random() * tot; for (const id of pool) { r -= wt[MATERIALS[id].r] * (MATERIALS[id].r === 'common' ? 1 : bias); if (r <= 0) return id; } return pool[0]; };
  for (let i = 0; i < rolls; i++) { const id = one(kind === 'myth' ? 3 : kind === 'boss' ? 1.8 : 1); got[id] = (got[id] || 0) + 1; }
  if (kind === 'myth') { const rare = pool.filter(id => MATERIALS[id].r !== 'common'); const id = pick(rare); got[id] = (got[id] || 0) + 1; }
  for (const id in got) addMat(id, got[id]);
  return got;
}
function recipeReady(r) {
  const base = S.swords.find(w => w.id === r.base && !w.captured);
  const mats = Object.entries(r.mats).every(([id, n]) => matCount(id) >= n);
  return { base: !!base, mats, ok: !!base && mats && !ownsSword(r.id) };
}
function elTag(el) { return el ? `<span class="el" style="color:${ELEMENTS[el].c}">${ELEMENTS[el].i} ${ELEMENTS[el].n}</span>` : ''; }
function skillNeed(l) { return 40 + l * 30; }
function stats() {
  const o = outfitDef(S.outfit), k = S.sk;
  return {
    maxHp: Math.round(100 + (k.vital.l - 1) * 12 + (o.hp || 0)),
    atk: swordDmg(eqSword()) * (1 + (k.power.l - 1) * 0.08 + (o.dmg || 0)),
    cd: Math.max(150, 400 - (k.speed.l - 1) * 11),
    staRegen: 30 + (k.speed.l - 1) * 2.2,
    staCost: Math.max(13, 22 - (k.speed.l - 1) * .35),
    parry: Math.min(0.78, 0.42 + (k.guard.l - 1) * 0.022),
    block: Math.min(0.9, 0.55 + (k.guard.l - 1) * 0.018 + swordFx(eqSword()).guard),
    drawBonus: (k.iai.l - 1) * .035,
    drawSlow: (k.iai.l - 1) * .012,
    crit: .05 + swordFx(eqSword()).crit, el: swordFx(eqSword()).el, spiritGain: 1 + swordFx(eqSword()).spirit,
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
/* blades made at this player's forge, and blades won from rivals: the ones that can be wagered in a challenge */
function forgedBlades() { return S.swords.filter(w => w.made && !w.won && !w.captured); }
function wagerBlades() { return S.swords.filter(w => (w.made || w.won) && !w.captured); }
function bestSword() {
  return S.swords.slice().sort((a, b) => RAR[swordDef(b.id).r].i - RAR[swordDef(a.id).r].i || swordDmg(b) - swordDmg(a))[0];
}
function totalStars() { return Object.values(S.stars).reduce((a, b) => a + b, 0); }

/* ---------- journey progress ---------- */
function chapterUnlocked(ch) { return ch === 0 || !!(S.journey[ch - 1] && S.journey[ch - 1].myth); }
function chapterStages(ch) { return STAGES.map((s, i) => [s, i]).filter(([s]) => s.ch === ch).sort((a, b) => a[0].ord - b[0].ord); }
function trainMet(st) { return !st.train || S.sk[st.train.sk].l >= st.train.l; }
function trainNeed(st) { return st.train ? `${SKILLS[st.train.sk].n} level ${st.train.l}` : ''; }
function warriorsBeaten(ch) { return chapterStages(ch).filter(([, i]) => S.beaten[i]).length; }
function orbsFound(ch) { return S.journey[ch].orbs.filter(Boolean).length; }
function currentChapter() { for (let c = 0; c < NL; c++) if (!S.journey[c].myth) return c; return NL - 1; }
function warriorCount(ch) { return chapterStages(ch).length; }
function gateOpen(ch) { return warriorsBeaten(ch) === warriorCount(ch) && S.journey[ch].puzzle && !!S.journey[ch].key; }
function playerPower() {
  const st = stats();
  return Math.round(st.atk * Math.sqrt(st.maxHp / 100) * (1 + (S.sk.guard.l - 1) * .03));
}
function journeyObjective(ch) {
  const j = S.journey[ch], wb = warriorsBeaten(ch), of = orbsFound(ch);
  if (j.myth) return 'Chapter complete! Explore freely or rematch anyone.';
  if (of < 3) return `Find the spirit orbs (${of}/3) · Warriors defeated ${wb}/${warriorCount(ch)}`;
  if (!j.puzzle) return `Bring the orbs to the shrine and solve its puzzle · Warriors ${wb}/${warriorCount(ch)}`;
  if (wb < warriorCount(ch)) { const nx = chapterStages(ch).find(([s, i]) => !S.beaten[i]); return nx && !trainMet(nx[0]) ? `${nx[0].name} only duels trained samurai: reach ${trainNeed(nx[0])} in the Dojo` : `Defeat the warriors of this land (${wb}/${warriorCount(ch)}) to open the spirit gate`; }
  if (!j.key) return `${MYTHS[ch].name} roams this land. Defeat it to win the Spirit Key!`;
  return `The spirit gate is open. Face the Spirit Warrior of ${MYTHS[ch].name}!`;
}
