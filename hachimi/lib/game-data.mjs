export const CREATURE_IDS = new Set([
  'dewdrop', 'sunbud', 'rainpuff', 'emberbubble',
  'cloudcap', 'startail', 'amberbell', 'quietide',
  'mooncrown', 'rainbowbranch', 'dreamwhale', 'heartflame', 'hachimi',
]);

export const PLAYABLE_IDS = new Set(['hachimi']);
export const MOODS = new Set(['calm', 'bright', 'tired', 'restless']);
const OUTFIT_LEVELS = {
  basic: 1, frog: 2, sleep: 3, office: 4,
  'penguin-basic': 2,
  'raccoon-basic': 3,
  'dog-basic': 4,
  'duck-basic': 5,
  'rabbit-basic': 6,
  'pig-basic': 7,
  'bear-basic': 8,
};
const ANIMAL_LEVELS = { hachimi: 1, penguin: 2, raccoon: 3, dog: 4, duck: 5, rabbit: 6, pig: 7, bear: 8 };

const clampInt = (value, minimum, maximum) => {
  const number = Number(value);
  return Number.isFinite(number)
    ? Math.min(maximum, Math.max(minimum, Math.floor(number)))
    : minimum;
};

export function createDefaultSave() {
  return {
    version: 5,
    glow: 30,
    fragments: 0,
    mood: 'calm',
    selectedHero: 'hachimi',
    unlocked: ['hachimi'],
    bond: { hachimi: 0 },
    level: 1,
    xp: 0,
    outfit: 'basic',
    unlockedOutfits: ['basic'],
    animal: 'hachimi',
    unlockedAnimals: ['hachimi'],
    completedLevels: [],
    infiniteUnlocked: false,
    selectedChapter: 'home',
    stats: { runs: 0, bestScore: 0, bestCombo: 0, totalCleared: 0, bestInfiniteTimeMs: 0 },
    hatches: 0,
    pity: 0,
    discovered: { hachimi: 1 },
    specimens: [],
    lastSeen: Date.now(),
  };
}

export function sanitizeSave(value) {
  const source = value && typeof value === 'object' ? value : {};
  const discovered = {};
  for (const [id, count] of Object.entries(source.discovered ?? {}).slice(0, 50)) {
    if (CREATURE_IDS.has(id)) discovered[id] = clampInt(count, 0, 100_000);
  }

  const specimens = Array.isArray(source.specimens)
    ? source.specimens.slice(-12).flatMap((item) => {
        if (!item || !CREATURE_IDS.has(item.id)) return [];
        return [{
          id: item.id,
          rarity: ['common', 'rare', 'epic'].includes(item.rarity) ? item.rarity : 'common',
          bornAt: clampInt(item.bornAt, 0, Date.now()),
        }];
      })
    : [];

  const level = clampInt(source.level || 1, 1, 100);
  const unlockedOutfits = Array.isArray(source.unlockedOutfits)
    ? source.unlockedOutfits.filter((id) => OUTFIT_LEVELS[id]).slice(0, Object.keys(OUTFIT_LEVELS).length)
    : ['basic'];
  for (const [id, requiredLevel] of Object.entries(OUTFIT_LEVELS)) {
    if (requiredLevel <= level && !unlockedOutfits.includes(id)) unlockedOutfits.push(id);
  }
  if (!unlockedOutfits.includes('basic')) unlockedOutfits.unshift('basic');
  const unlockedAnimals = Array.isArray(source.unlockedAnimals)
    ? source.unlockedAnimals.filter((id) => ANIMAL_LEVELS[id]).slice(0, Object.keys(ANIMAL_LEVELS).length)
    : ['hachimi'];
  for (const [id, requiredLevel] of Object.entries(ANIMAL_LEVELS)) {
    if (requiredLevel <= level && !unlockedAnimals.includes(id)) unlockedAnimals.push(id);
  }
  if (!unlockedAnimals.includes('hachimi')) unlockedAnimals.unshift('hachimi');
  const selectedAnimal = unlockedAnimals.includes(source.animal) ? source.animal : 'hachimi';
  const completedLevels = Array.isArray(source.completedLevels)
    ? [...new Set(source.completedLevels.filter((id) => ['home', 'office', 'monday'].includes(id)))]
    : [];
  const infiniteUnlocked = Boolean(source.infiniteUnlocked) || ['home', 'office', 'monday'].every((id) => completedLevels.includes(id));
  const selectedChapter = ['home', 'office', 'monday', 'infinite'].includes(source.selectedChapter) ? source.selectedChapter : 'home';
  const stats = source.stats && typeof source.stats === 'object' ? source.stats : {};

  return {
    version: 5,
    glow: clampInt(source.glow, 0, 1_000_000),
    fragments: clampInt(source.fragments, 0, 1_000_000),
    mood: MOODS.has(source.mood) ? source.mood : 'calm',
    selectedHero: 'hachimi',
    unlocked: ['hachimi'],
    bond: { hachimi: clampInt(source.bond?.hachimi, 0, 100) },
    level,
    xp: clampInt(source.xp, 0, 1_000_000),
    outfit: unlockedOutfits.includes(source.outfit) ? source.outfit : 'basic',
    unlockedOutfits,
    animal: selectedAnimal,
    unlockedAnimals,
    completedLevels,
    infiniteUnlocked,
    selectedChapter,
    stats: {
      runs: clampInt(stats.runs ?? source.hatches, 0, 100_000),
      bestScore: clampInt(stats.bestScore, 0, 100_000_000),
      bestCombo: clampInt(stats.bestCombo, 0, 100_000),
      totalCleared: clampInt(stats.totalCleared, 0, 10_000_000),
      bestInfiniteTimeMs: clampInt(stats.bestInfiniteTimeMs, 0, 86_400_000),
    },
    hatches: clampInt(source.hatches, 0, 100_000),
    pity: clampInt(source.pity, 0, 20),
    discovered,
    specimens,
    lastSeen: clampInt(source.lastSeen, 0, Date.now()),
  };
}
