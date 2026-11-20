import React from 'react';
import { useStore } from '../services/store';
import { Promotion } from '../types';
import { ExternalLink, MessageCircle, ArrowRight } from 'lucide-react';
import { openTelegramOrWeb, hapticImpact } from '../services/telegram';
import { getLoyaltyTierBySpend, BONUS_PER_BYN_REDEEM } from '../utils/loyalty';

interface PrizesTabProps {
  onSelectPromotion: (promo: Promotion) => void;
  onOpenLoyalty: () => void;
}

export const PrizesTab: React.FC<PrizesTabProps> = ({ onSelectPromotion, onOpenLoyalty }) => {
  const { promotions, settings, currentLoyaltyUser } = useStore();

  const userSpend = Math.max(0, Number(currentLoyaltyUser?.total_spent_byn) || 0);
  const userBonuses = Math.max(0, Math.floor(Number(currentLoyaltyUser?.bonus_balance ?? 0)));
  const userSpins = Math.max(0, Math.floor(Number(currentLoyaltyUser?.wheel_spins ?? 0)));
  const userTier = getLoyaltyTierBySpend(userSpend);

  const handleManagerContact = () => {
    hapticImpact('medium');
    openTelegramOrWeb(`https://t.me/${settings.manager_username}`);
  };

  return (
    <div className="space-y-4 pb-24">
      {/* Banner */}
      <div className="p-4 rounded-3xl bg-gradient-to-r from-purple-900/40 via-fuchsia-900/20 to-orange-900/40 border border-purple-500/30 flex items-center gap-3.5 shadow-lg">
        <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-2xl shrink-0 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
          🎁
        </div>
        <div>
          <h3 className="text-sm font-bold text-white leading-tight">Акции и розыгрыши</h3>
          <p className="text-xs text-zinc-300 mt-0.5">Участвуйте в розыгрышах и получайте подарки к заказам!</p>
        </div>
      </div>

      {/* Loyalty Program & Prize Wheel Entry Card */}
      <div className="p-4 rounded-3xl bg-gradient-to-br from-[#1a1230] via-[#131024] to-[#1e1320] border border-amber-400/30 shadow-lg space-y-3">
        <div className="flex items-start gap-3.5">
          <div className="relative w-16 h-16 rounded-2xl overflow-hidden border border-purple-400/40 bg-gradient-to-br from-purple-700/40 via-[#151029] to-amber-500/30 shrink-0 flex items-center justify-center">
            <span className="text-2xl select-none" aria-hidden="true">🎁</span>
            <img
              src="/promo/frame_2_wheel.jpg"
              alt="Колесо призов"
              referrerPolicy="no-referrer"
              className="absolute inset-0 w-full h-full object-cover scale-110"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-semibold text-amber-300 tabular-nums">
              {userTier.badgeEmoji} {userTier.title} · {userBonuses} бон. (= {Math.floor(userBonuses / BONUS_PER_BYN_REDEEM)} BYN)
            </div>
            <h4 className="text-sm font-black text-white mt-0.5 leading-snug">
              Колесо призов и программа лояльности
            </h4>
            <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
              Получайте 10 бонусов за каждый 1 BYN, крутите колесо на новых уровнях и списывайте до 12% баллами.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            hapticImpact('medium');
            onOpenLoyalty();
          }}
          className="w-full min-h-[44px] px-4 rounded-2xl font-bold text-xs text-white bg-gradient-to-r from-purple-600 via-fuchsia-600 to-orange-500 shadow-[0_0_20px_rgba(168,85,247,0.35)] flex items-center justify-center gap-2 tap-active"
        >
          <span>
            {userSpins > 0
              ? `Крутить колесо (доступно: ${userSpins})`
              : 'Открыть колесо и мой статус'}
          </span>
          <ArrowRight className="w-4 h-4" />
        </button>
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
        <p className="text-xs text-zinc-300">Хотите предложить совместную акцию или уточнить условия?</p>
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
