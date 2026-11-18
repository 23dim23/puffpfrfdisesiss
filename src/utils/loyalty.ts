export type LoyaltyTierId = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'VIP';

export interface LoyaltyTierConfig {
  id: LoyaltyTierId;
  name: string;
  title: string;
  displayLabel: string;
  minSpend: number;
  maxSpend: number | null;
  minSpendByn: number;
  maxSpendByn: number | null;
  rewardSpins: number;
  rewardBonuses: number;
  wheelSpins: number;
  welcomeBonuses: number;
  maxDiscountPercent: number;
  freeCityDelivery: boolean;
  badgeEmoji: string;
  accentColor: string;
  accentClass: string;
  gradientClass: string;
  borderClass: string;
  badgeBg: string;
}

export const LOYALTY_TIERS: LoyaltyTierConfig[] = [
  {
    id: 'BRONZE',
    name: 'BROZNE',
    title: 'BROZNE',
    displayLabel: 'BROZNE (0–99 BYN)',
    minSpend: 0,
    maxSpend: 99,
    minSpendByn: 0,
    maxSpendByn: 99,
    rewardSpins: 1,
    rewardBonuses: 100,
    wheelSpins: 1,
    welcomeBonuses: 100,
    maxDiscountPercent: 5,
    freeCityDelivery: false,
    badgeEmoji: '🥉',
    accentColor: '#d97706',
    accentClass: 'text-amber-300',
    gradientClass: 'from-amber-900/45 via-orange-950/40 to-zinc-900/60',
    borderClass: 'border-amber-500/40',
    badgeBg: 'from-amber-700/40 to-orange-900/30 border-amber-500/40 text-amber-300',
  },
  {
    id: 'SILVER',
    name: 'SILVER',
    title: 'SILVER',
    displayLabel: 'SILVER (100–249 BYN)',
    minSpend: 100,
    maxSpend: 249,
    minSpendByn: 100,
    maxSpendByn: 249,
    rewardSpins: 2,
    rewardBonuses: 200,
    wheelSpins: 2,
    welcomeBonuses: 200,
    maxDiscountPercent: 7,
    freeCityDelivery: false,
    badgeEmoji: '🥈',
    accentColor: '#94a3b8',
    accentClass: 'text-slate-200',
    gradientClass: 'from-slate-800/50 via-zinc-900/50 to-slate-950/60',
    borderClass: 'border-slate-400/40',
    badgeBg: 'from-slate-600/40 to-zinc-800/40 border-slate-400/40 text-slate-200',
  },
  {
    id: 'GOLD',
    name: 'GOLD',
    title: 'GOLD',
    displayLabel: 'GOLD (250–499 BYN)',
    minSpend: 250,
    maxSpend: 499,
    minSpendByn: 250,
    maxSpendByn: 499,
    rewardSpins: 2,
    rewardBonuses: 200,
    wheelSpins: 2,
    welcomeBonuses: 200,
    maxDiscountPercent: 10,
    freeCityDelivery: false,
    badgeEmoji: '🥇',
    accentColor: '#eab308',
    accentClass: 'text-yellow-300',
    gradientClass: 'from-yellow-800/45 via-amber-950/45 to-zinc-900/60',
    borderClass: 'border-yellow-400/50',
    badgeBg: 'from-yellow-600/40 to-amber-800/40 border-yellow-400/50 text-yellow-200',
  },
  {
    id: 'PLATINUM',
    name: 'PLATINUM',
    title: 'PLATINUM',
    displayLabel: 'PLATINUM (500–999 BYN)',
    minSpend: 500,
    maxSpend: 999,
    minSpendByn: 500,
    maxSpendByn: 999,
    rewardSpins: 3,
    rewardBonuses: 250,
    wheelSpins: 3,
    welcomeBonuses: 250,
    maxDiscountPercent: 12,
    freeCityDelivery: false,
    badgeEmoji: '💎',
    accentColor: '#38bdf8',
    accentClass: 'text-cyan-300',
    gradientClass: 'from-cyan-900/45 via-blue-950/45 to-zinc-900/60',
    borderClass: 'border-cyan-400/50',
    badgeBg: 'from-cyan-600/40 to-blue-900/40 border-cyan-400/50 text-cyan-200',
  },
  {
    id: 'VIP',
    name: 'VIP',
    title: 'VIP',
    displayLabel: 'VIP (1000+ BYN)',
    minSpend: 1000,
    maxSpend: null,
    minSpendByn: 1000,
    maxSpendByn: null,
    rewardSpins: 3,
    rewardBonuses: 300,
    wheelSpins: 3,
    welcomeBonuses: 300,
    maxDiscountPercent: 12,
    freeCityDelivery: true,
    badgeEmoji: '👑',
    accentColor: '#a855f7',
    accentClass: 'text-purple-300',
    gradientClass: 'from-purple-900/55 via-fuchsia-950/50 to-amber-950/40',
    borderClass: 'border-purple-400/60',
    badgeBg: 'from-purple-600/50 to-fuchsia-900/50 border-purple-400/60 text-purple-200',
  },
];

export interface WheelPrizeSector {
  id: number;
  bonuses: number;
  bonusAmount: number;
  chancePercent: number;
  label: string;
  color: string;
}

export const WHEEL_SECTORS: WheelPrizeSector[] = [
  { id: 1, bonuses: 50, bonusAmount: 50, chancePercent: 71, label: '50 бонусов', color: '#7c3aed' },
  { id: 2, bonuses: 100, bonusAmount: 100, chancePercent: 21, label: '100 бонусов', color: '#db2777' },
  { id: 3, bonuses: 200, bonusAmount: 200, chancePercent: 5, label: '200 бонусов', color: '#ea580c' },
  { id: 4, bonuses: 500, bonusAmount: 500, chancePercent: 2, label: '500 бонусов', color: '#059669' },
  { id: 5, bonuses: 1000, bonusAmount: 1000, chancePercent: 1, label: '1000 бонусов', color: '#eab308' },
];

export const BONUSES_PER_BYN_EARNED = 10; // 1 руб = 10 бонусов (100 руб = 1000 бонусов)
export const BONUS_PER_BYN_EARNED = BONUSES_PER_BYN_EARNED;
export const BONUSES_PER_BYN_REDEEM = 100; // 100 бонусов = 1 рубль скидки (шаг списания 100 бонусов = 1 BYN)
export const BONUS_PER_BYN_REDEEM = BONUSES_PER_BYN_REDEEM;
export const DELIVERY_BONUS_COST = 500; // 5 BYN = 500 бонусов за полную доставку
export const DELIVERY_PRICE_BYN = 5;

export function getLoyaltyTierBySpend(spendByn: number): LoyaltyTierConfig {
  const cleanSpend = Math.max(0, Number(spendByn) || 0);
  for (let i = LOYALTY_TIERS.length - 1; i >= 0; i--) {
    if (cleanSpend >= LOYALTY_TIERS[i].minSpend) {
      return LOYALTY_TIERS[i];
    }
  }
  return LOYALTY_TIERS[0];
}

export function getNextLoyaltyTier(spendByn: number): {
  nextTier: LoyaltyTierConfig | null;
  remainingByn: number;
  progressPercent: number;
} {
  const cleanSpend = Math.max(0, Number(spendByn) || 0);
  const currentTier = getLoyaltyTierBySpend(cleanSpend);
  const currentIdx = LOYALTY_TIERS.findIndex((t) => t.id === currentTier.id);
  const nextTier = currentIdx < LOYALTY_TIERS.length - 1 ? LOYALTY_TIERS[currentIdx + 1] : null;

  if (!nextTier) {
    return { nextTier: null, remainingByn: 0, progressPercent: 100 };
  }

  const span = nextTier.minSpend - currentTier.minSpend;
  const progressed = cleanSpend - currentTier.minSpend;
  const progressPercent = Math.min(100, Math.max(0, Math.round((progressed / span) * 100)));
  const remainingByn = Math.max(0, Number((nextTier.minSpend - cleanSpend).toFixed(2)));

  return { nextTier, remainingByn, progressPercent };
}

/**
 * Rolls the prize wheel using exact weighted probabilities:
 * 50 bonuses (71%), 100 bonuses (21%), 200 bonuses (5%), 500 bonuses (2%), 1000 bonuses (1%)
 */
export function rollWheelSector(): WheelPrizeSector {
  const rand = Math.random() * 100;
  let cumulative = 0;
  for (const sector of WHEEL_SECTORS) {
    cumulative += sector.chancePercent;
    if (rand < cumulative) {
      return sector;
    }
  }
  return WHEEL_SECTORS[0];
}

/**
 * Calculates the maximum integer BYN discount a user can redeem with bonuses on an order,
 * strictly in multiples of 100 bonuses (1 BYN, 2 BYN, 3 BYN...).
 */
export function calculateMaxBonusDiscountByn(params: {
  orderAmountAfterPromos: number;
  userBonusBalance: number;
  userSpendByn: number;
  reserveForDeliveryBonuses?: number;
}): {
  maxBynByTier: number;
  maxBonusesByTier: number;
  availableBonusesForOrder: number;
  maxRedeemableByn: number;
  maxRedeemableBonuses: number;
  tier: LoyaltyTierConfig;
} {
  const tier = getLoyaltyTierBySpend(params.userSpendByn);
  const cleanOrder = Math.max(0, Number(params.orderAmountAfterPromos) || 0);
  const reserve = Math.max(0, Number(params.reserveForDeliveryBonuses) || 0);
  const availableBonusesForOrder = Math.max(0, Math.floor((Number(params.userBonusBalance) || 0) - reserve));

  // Only whole BYN (100 bonuses = 1 BYN) can be deducted, never kopecks
  const maxBynByTier = Math.floor((cleanOrder * tier.maxDiscountPercent) / 100);
  const maxBynByBalance = Math.floor(availableBonusesForOrder / BONUSES_PER_BYN_REDEEM);
  const maxRedeemableByn = Math.max(0, Math.min(maxBynByTier, maxBynByBalance, Math.floor(cleanOrder)));

  return {
    maxBynByTier,
    maxBonusesByTier: maxBynByTier * BONUSES_PER_BYN_REDEEM,
    availableBonusesForOrder,
    maxRedeemableByn,
    maxRedeemableBonuses: maxRedeemableByn * BONUSES_PER_BYN_REDEEM,
    tier,
  };
}

/**
 * Computes which tier rewards (welcome BRONZE + any unlocked higher tiers) should be granted
 * given the user's current spendByn and already claimed tiers.
 */
export function computeUnclaimedTierRewards(
  spendByn: number,
  alreadyClaimed: LoyaltyTierId[] = []
): {
  addedBonuses: number;
  addedSpins: number;
  newClaimedTiers: LoyaltyTierId[];
  newlyUnlockedTiers: LoyaltyTierConfig[];
} {
  const cleanSpend = Math.max(0, Number(spendByn) || 0);
  const claimedSet = new Set<LoyaltyTierId>(alreadyClaimed);
  let addedBonuses = 0;
  let addedSpins = 0;
  const newlyUnlockedTiers: LoyaltyTierConfig[] = [];

  for (const tier of LOYALTY_TIERS) {
    // BRONZE (minSpend 0) is always unlocked immediately on entry
    if (cleanSpend >= tier.minSpend && !claimedSet.has(tier.id)) {
      claimedSet.add(tier.id);
      addedBonuses += tier.rewardBonuses;
      addedSpins += tier.rewardSpins;
      newlyUnlockedTiers.push(tier);
    }
  }

  return {
    addedBonuses,
    addedSpins,
    newClaimedTiers: Array.from(claimedSet),
    newlyUnlockedTiers,
  };
}
