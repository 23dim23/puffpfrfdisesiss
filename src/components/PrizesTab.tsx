import React from 'react';
import { useStore } from '../services/store';
import { Promotion } from '../types';
import { Gift, ExternalLink, Sparkles, MessageCircle, Coins, Crown } from 'lucide-react';
import { openTelegramOrWeb, hapticImpact } from '../services/telegram';
import { getLoyaltyTierBySpend } from '../utils/loyalty';

interface PrizesTabProps {
  onSelectPromotion: (promo: Promotion) => void;
  onOpenLoyaltyModal?: () => void;
}

export const PrizesTab: React.FC<PrizesTabProps> = ({ onSelectPromotion, onOpenLoyaltyModal }) => {
  const { promotions, settings, currentLoyaltyUser } = useStore();

  const userSpend = Number(currentLoyaltyUser?.total_spent_byn || 0);
  const userBonuses = Math.max(0, Math.floor(Number(currentLoyaltyUser?.bonus_balance ?? 100)));
  const userSpins = Math.max(0, Math.floor(Number(currentLoyaltyUser?.wheel_spins ?? 1)));
  const currentTier = getLoyaltyTierBySpend(userSpend);

  const handleManagerContact = () => {
    hapticImpact('medium');
    openTelegramOrWeb(`https://t.me/${settings.manager_username}`);
  };

  return (
    <div className="space-y-4 pb-24">
      {/* Loyalty & Wheel Interactive Card */}
      <div
        onClick={() => {
          if (onOpenLoyaltyModal) {
            hapticImpact('medium');
            onOpenLoyaltyModal();
          }
        }}
        className="p-4 rounded-3xl bg-gradient-to-br from-purple-900/50 via-[#17112a] to-orange-900/40 border border-purple-500/40 shadow-[0_0_25px_rgba(168,85,247,0.2)] space-y-3 cursor-pointer tap-active"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-orange-500 flex items-center justify-center text-2xl shrink-0 shadow-[0_0_15px_rgba(168,85,247,0.4)]">
              🎡
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-black text-white leading-tight">Программа лояльности & Колесо</h3>
              </div>
              <p className="text-xs text-zinc-300 mt-0.5">
                Уровень: <strong className={currentTier.accentClass}>{currentTier.badgeEmoji} {currentTier.title}</strong> (до {currentTier.maxDiscountPercent}% баллами)
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-1">
          <div className="p-2 rounded-xl bg-black/40 border border-white/10 text-center">
            <div className="text-[10px] text-zinc-400">Ваши бонусы</div>
            <div className="text-sm font-black text-amber-300">{userBonuses}</div>
          </div>
          <div className="p-2 rounded-xl bg-black/40 border border-white/10 text-center">
            <div className="text-[10px] text-zinc-400">Колёса призов</div>
            <div className="text-sm font-black text-purple-300">{userSpins} шт.</div>
          </div>
          <div className="p-2 rounded-xl bg-black/40 border border-white/10 text-center">
            <div className="text-[10px] text-zinc-400">Кэшбэк</div>
            <div className="text-sm font-black text-emerald-300">1 BYN = 10</div>
          </div>
        </div>

        {onOpenLoyaltyModal && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              hapticImpact('medium');
              onOpenLoyaltyModal();
            }}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-purple-600 via-fuchsia-600 to-orange-500 shadow-md flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Открыть Колесо Призов и уровни ({userSpins} круток)</span>
          </button>
        )}
      </div>

      {/* Promos list */}
      <div className="space-y-3">
        {promotions.map((promo) => (
          <div
            key={promo.id}
            onClick={() => {
              hapticImpact('light');
              onSelectPromotion(promo);
            }}
            className="p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-purple-500/40 transition-all cursor-pointer shadow-md tap-active"
          >
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600/30 to-orange-500/20 border border-purple-500/30 flex items-center justify-center text-2xl shrink-0">
                {promo.image_emoji || '🎉'}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-xs font-bold text-white truncate">{promo.title}</h4>
                </div>

                {promo.condition_text && (
                  <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 mb-1.5">
                    {promo.condition_text}
                  </span>
                )}

                <p className="text-xs text-zinc-300 leading-relaxed line-clamp-2">
                  {promo.short_description || promo.description}
                </p>

                <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/5 text-[11px] text-purple-400 font-semibold">
                  <span>Подробнее об условиях →</span>
                  {promo.button_url && (
                    <span className="text-zinc-400 flex items-center gap-1 text-[10px]">
                      Ссылка <ExternalLink className="w-3 h-3" />
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Support / Giveaway Contact */}
      <div className="p-4 rounded-2xl bg-black/40 border border-white/10 text-center space-y-2">
        <p className="text-xs text-zinc-300">Хотите предложить совместную акцию или уточнить условия бонусов?</p>
        <button
          onClick={handleManagerContact}
          className="py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-white/10 hover:bg-white/20 border border-white/10 transition-all inline-flex items-center gap-1.5 tap-active"
        >
          <MessageCircle className="w-3.5 h-3.5 text-purple-400" />
          <span>Написать менеджеру @{settings.manager_username}</span>
        </button>
      </div>
    </div>
  );
};
