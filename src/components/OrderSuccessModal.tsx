import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { MessageCircle, PackageCheck, CheckCircle2, Sparkles } from 'lucide-react';
import { openTelegramOrWeb, hapticNotification } from '../services/telegram';
import { useStore } from '../services/store';

interface OrderSuccessModalProps {
  orderId: number;
  total: number;
  onClose: () => void;
  onGoToOrders: () => void;
}

export const OrderSuccessModal: React.FC<OrderSuccessModalProps> = ({
  orderId,
  total,
  onClose,
  onGoToOrders,
}) => {
  const { settings } = useStore();

  useEffect(() => {
    hapticNotification('success');

    // Launch celebratory confetti
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#a855f7', '#f97316', '#ec4899', '#22c55e'],
      });
    } catch (e) {
      // Ignore
    }
  }, []);

  const handleManagerContact = () => {
    openTelegramOrWeb(`https://t.me/${settings.manager_username}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity" onClick={onClose} />

      <div className="relative w-full max-w-[380px] bg-[#141221] border border-purple-500/30 rounded-3xl p-6 shadow-[0_25px_70px_rgba(0,0,0,0.9),0_0_35px_rgba(168,85,247,0.25)] text-center z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Animated Celebration Badge */}
        <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-tr from-purple-600 to-orange-500 flex items-center justify-center text-3xl shadow-[0_0_25px_rgba(168,85,247,0.5)] mb-4 animate-bounce">
          🎉
        </div>

        <h2 className="text-2xl font-black text-white mb-2 tracking-tight">Готово 🎉</h2>

        {/* Order Details card */}
        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 my-4 text-sm text-zinc-300">
          <p className="text-base font-bold text-white mb-1">
            Заказ <span className="text-purple-400">#{orderId}</span> на{' '}
            <span className="text-orange-400 font-extrabold">{total.toFixed(2)} BYN</span>.
          </p>
          <p className="text-xs text-zinc-400 font-medium mt-1">Оплата: 💵 Наличные / картой при получении</p>
          <div className="w-full h-px bg-white/10 my-2.5" />
          <p className="text-xs font-semibold text-purple-300 flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Заказ принят. Менеджер напишет вам в Telegram.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-2.5 mt-5">
          <button
            onClick={handleManagerContact}
            className="w-full py-3.5 px-4 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-purple-600 via-fuchsia-600 to-orange-500 shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:shadow-[0_0_30px_rgba(249,115,22,0.5)] transition-all flex items-center justify-center gap-2 tap-active pulse-glow"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Написать менеджеру (@{settings.manager_username})</span>
          </button>

          <button
            onClick={() => {
              onGoToOrders();
              onClose();
            }}
            className="w-full py-3 px-4 rounded-2xl font-semibold text-xs text-zinc-300 bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 transition-all flex items-center justify-center gap-2 tap-active"
          >
            <PackageCheck className="w-4 h-4 text-purple-400" />
            <span>Мои заказы</span>
          </button>
        </div>
      </div>
    </div>
  );
};
