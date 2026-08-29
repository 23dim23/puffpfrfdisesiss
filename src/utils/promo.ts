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

  for (const promo of activePromos) {
    // Find item A and B in cart
    const itemA = cart.find(item => item.id === promo.product_a_id);
    const itemB = cart.find(item => item.id === promo.product_b_id);

    if (itemA && itemB && itemA.quantity > 0 && itemB.quantity > 0) {
      // Number of possible bundle pairs
      const qtyA = itemA.quantity;
      const qtyB = itemB.quantity;
      const pairsCount = Math.min(qtyA, qtyB);

      if (pairsCount > 0) {
        const priceB = itemB.discount_price && itemB.discount_price > 0 ? itemB.discount_price : itemB.price;
        
        let singleDiscount = 0;
        if (promo.discount_type === 'percent') {
          singleDiscount = (priceB * promo.discount_value) / 100;
        } else if (promo.discount_type === 'fixed_price') {
          singleDiscount = Math.max(0, priceB - promo.discount_value);
        }

        const promoDiscount = singleDiscount * pairsCount;
        if (promoDiscount > 0) {
          totalDiscount += promoDiscount;
          applied.push({
            promoId: promo.id,
            name: promo.name,
            discount: Number(promoDiscount.toFixed(2)),
            count: pairsCount,
          });
        }
      }
    }
  }

  return {
    applied,
    totalDiscount: Number(totalDiscount.toFixed(2)),
  };
}
