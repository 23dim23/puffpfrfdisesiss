import { CartItem, BundlePromotion } from '../types';

export interface AppliedBundlePromoInfo {
  promoId: number;
  name: string;
  discount: number;
  count: number;
}

export function calculateBundlePromotions(cart: CartItem[], bundlePromotions: BundlePromotion[]): {
  applied: AppliedBundlePromoInfo[];
  totalDiscount: number;
} {
  const applied: AppliedBundlePromoInfo[] = [];
  let totalDiscount = 0;

  if (!cart || !bundlePromotions) {
    return { applied: [], totalDiscount: 0 };
  }

  // Only consider active bundle promotions
  const activePromos = bundlePromotions.filter(p => p.is_active);

  // Expand the cart into single-item units so we can pair them individually
  interface ExpandedUnit {
    cartItem: CartItem;
    originalIndex: number;
    price: number;
    isUsed: boolean;
  }

  const units: ExpandedUnit[] = [];
  cart.forEach((item, index) => {
    const price = item.discount_price && item.discount_price > 0 ? item.discount_price : item.price;
    for (let i = 0; i < item.quantity; i++) {
      units.push({
        cartItem: item,
        originalIndex: index,
        price,
        isUsed: false,
      });
    }
  });

  // Helper matching functions
  const matchesA = (unit: ExpandedUnit, promo: BundlePromotion) => {
    if (promo.type_a === 'product') {
      return unit.cartItem.id === promo.product_a_id;
    } else {
      return unit.cartItem.brand_slug === promo.brand_a_slug;
    }
  };

  const matchesB = (unit: ExpandedUnit, promo: BundlePromotion) => {
    if (promo.type_b === 'product') {
      return unit.cartItem.id === promo.product_b_id;
    } else {
      return unit.cartItem.brand_slug === promo.brand_b_slug;
    }
  };

  for (const promo of activePromos) {
    let promoDiscount = 0;
    let pairsCount = 0;

    while (true) {
      let bestPair: [number, number] | null = null;

      for (let i = 0; i < units.length; i++) {
        if (units[i].isUsed || !matchesA(units[i], promo)) continue;
        
        for (let j = 0; j < units.length; j++) {
          if (units[j].isUsed || i === j || !matchesB(units[j], promo)) continue;

          bestPair = [i, j];
          break;
        }
        if (bestPair) break;
      }

      if (!bestPair) {
        break;
      }

      const [idxA, idxB] = bestPair;
      units[idxA].isUsed = true;
      units[idxB].isUsed = true;

      const unitB = units[idxB];
      let singleDiscount = 0;
      if (promo.discount_type === 'percent') {
        singleDiscount = (unitB.price * promo.discount_value) / 100;
      } else if (promo.discount_type === 'fixed_price') {
        singleDiscount = Math.max(0, unitB.price - promo.discount_value);
      }

      promoDiscount += singleDiscount;
      pairsCount++;
    }

    if (pairsCount > 0 && promoDiscount > 0) {
      totalDiscount += promoDiscount;
      applied.push({
        promoId: promo.id,
        name: promo.name,
        discount: Number(promoDiscount.toFixed(2)),
        count: pairsCount,
      });
    }
  }

  return {
    applied,
    totalDiscount: Number(totalDiscount.toFixed(2)),
  };
}
