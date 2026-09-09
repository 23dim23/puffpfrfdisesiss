import React from 'react';
import { Promotion } from '../types';
import { X, Gift, ExternalLink, MessageCircle } from 'lucide-react';
import { openTelegramOrWeb, hapticImpact } from '../services/telegram';

interface PromotionDetailModalProps {
  promotion: Promotion | null;
  onClose: () => void;
  onGoToCatalog?: () => void;
}

export const PromotionDetailModal: React.FC<PromotionDetailModalProps> = ({ promotion, onClose, onGoToCatalog }) => {
  if (!promotion) return null;

  const handleAction = () => {
    hapticImpact('medium');
    if (promotion.button_url) {
      openTelegramOrWeb(promotion.button_url);
    } else if (onGoToCatalog) {
      onGoToCatalog();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity" onClick={onClose} />

      <div className="relative w-full max-w-[390px] max-h-[85vh] overflow-y-auto bg-[#13121d] border border-purple-500/30 rounded-3xl p-5 shadow-[0_20px_60px_rgba(0,0,0,0.8),0_0_30px_rgba(168,85,247,0.2)] no-scrollbar z-10 animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all tap-active-sm z-20"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Promo Header Icon */}
        <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-purple-600/30 via-fuchsia-500/20 to-orange-500/20 border border-purple-500/40 flex items-center justify-center text-4xl mb-4 shadow-[0_0_20px_rgba(168,85,247,0.3)]">
          {promotion.image_emoji || '🎉'}
        </div>

        <div className="text-center mb-4">
          {promotion.condition_text && (
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 mb-2 shadow-sm">
              {promotion.condition_text}
            </span>
          )}
          <h2 className="text-lg font-extrabold text-white leading-snug">{promotion.title}</h2>
        </div>

        <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 text-xs text-zinc-300 leading-relaxed mb-5">
          <p className="whitespace-pre-line">{promotion.description || promotion.short_description}</p>
        </div>

        <button
          onClick={handleAction}
          className="w-full py-3.5 px-4 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-purple-600 via-fuchsia-600 to-orange-500 shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:shadow-[0_0_30px_rgba(249,115,22,0.5)] transition-all flex items-center justify-center gap-2 tap-active pulse-glow"
        >
          {promotion.button_url ? <ExternalLink className="w-4 h-4" /> : <Gift className="w-4 h-4" />}
          <span>{promotion.button_text || 'Участвовать в акции'}</span>
        </button>
      </div>
    </div>
  );
};
