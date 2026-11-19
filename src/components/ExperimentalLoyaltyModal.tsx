import React, { useState, useMemo } from 'react';
import { useStore } from '../services/store';
import {
  LOYALTY_TIERS,
  WHEEL_SECTORS,
  BONUS_PER_BYN_EARNED,
  BONUS_PER_BYN_REDEEM,
  DELIVERY_BONUS_COST,
  DELIVERY_PRICE_BYN,
  getLoyaltyTierBySpend,
  getNextLoyaltyTier,
  LoyaltyTierConfig,
} from '../utils/loyalty';
import {
  X,
  Sparkles,
  Gift,
  Coins,
  Crown,
  Truck,
  ShieldCheck,
  Search,
  Plus,
  Minus,
  RefreshCw,
  CheckCircle2,
  UserPlus,
  History,
  Award,
  Zap,
  Sliders,
} from 'lucide-react';
import { hapticImpact, hapticNotification, hapticSelection } from '../services/telegram';
import { ShopUser } from '../types';

interface ExperimentalLoyaltyModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'client' | 'admin';
}

export const ExperimentalLoyaltyModal: React.FC<ExperimentalLoyaltyModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'client',
}) => {
  const {
    currentLoyaltyUser,
    users,
    isAdmin,
    isModerator,
    spinWheelForUser,
    updateUserLoyalty,
    syncUsersSpendFromOrders,
  } = useStore();

  const [activeMode, setActiveMode] = useState<'client' | 'admin'>(initialMode);

  // Wheel animation state
  const [isSpinning, setIsSpinning] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [lastWonBonus, setLastWonBonus] = useState<number | null>(null);
  const [spinError, setSpinError] = useState<string | null>(null);

  // Admin management state
  const [selectedUserId, setSelectedUserId] = useState<number>(() => currentLoyaltyUser?.id || 999999);
  const [searchQuery, setSearchQuery] = useState('');
  const [customBonusInput, setCustomBonusInput] = useState('');
  const [customSpinsInput, setCustomSpinsInput] = useState('');
  const [customRublesInput, setCustomRublesInput] = useState('');
  const [autoGrantTierRewards, setAutoGrantTierRewards] = useState(true);
  const [adminToast, setAdminToast] = useState<string | null>(null);
  const [newUserIdInput, setNewUserIdInput] = useState('');
  const [newUsernameInput, setNewUsernameInput] = useState('');

  // Active user in client view (either selected in admin or currentLoyaltyUser)
  const targetClientUser: ShopUser = useMemo(() => {
    const found = users.find((u) => Number(u.id) === Number(selectedUserId));
    return found || currentLoyaltyUser;
  }, [users, selectedUserId, currentLoyaltyUser]);

  const userSpend = Number(targetClientUser?.total_spent_byn || 0);
  const userBonuses = Math.max(0, Math.floor(Number(targetClientUser?.bonus_balance ?? 100)));
  const userSpins = Math.max(0, Math.floor(Number(targetClientUser?.wheel_spins ?? 1)));
  const currentTier = getLoyaltyTierBySpend(userSpend);
  const nextTierInfo = getNextLoyaltyTier(userSpend);
  const nextTier = nextTierInfo.nextTier;
  const progressPercent = nextTierInfo.progressPercent;

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = [...users].sort((a, b) => (b.total_spent_byn || 0) - (a.total_spent_byn || 0));
    if (!q) return list;
    return list.filter(
      (u) =>
        String(u.id).includes(q) ||
        (u.username || '').toLowerCase().includes(q) ||
        (u.first_name || '').toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  if (!isOpen || !isAdmin) return null;

  const showToast = (msg: string) => {
    setAdminToast(msg);
    setTimeout(() => {
      setAdminToast((prev) => (prev === msg ? null : prev));
    }, 2800);
  };

  // Spin the wheel with visual sector alignment
  const handleSpinWheel = () => {
    if (isSpinning) return;
    setSpinError(null);
    setLastWonBonus(null);

    if (userSpins <= 0) {
      setSpinError('У вас нет доступных прокрутов колеса. Повышайте уровень или получите прокрут у администратора!');
      hapticNotification('error');
      return;
    }

    hapticImpact('heavy');
    const result = spinWheelForUser(targetClientUser.id);
    if (!result.success || !result.sector) {
      setSpinError(result.error || 'Не удалось прокрутить колесо');
      hapticNotification('error');
      return;
    }

    setIsSpinning(true);

    // 5 visual slices of 72 degrees each (360 / 5 = 72 deg)
    // Sector index 0..4 (id 1..5)
    const sectorIndex = WHEEL_SECTORS.findIndex((s) => s.id === result.sector!.id);
    const sliceAngle = 360 / WHEEL_SECTORS.length; // 72 deg
    // Center of slice i is at i * 72 + 36 deg. To align with top pointer (0 deg), rotate to 360 - (i * 72 + 36)
    const targetNormalizedAngle = (360 - (sectorIndex * sliceAngle + sliceAngle / 2)) % 360;
    const currentMod = ((wheelRotation % 360) + 360) % 360;
    let delta = targetNormalizedAngle - currentMod;
    if (delta < 0) delta += 360;

    // Add 6 full rotations + slight random jitter inside the slice
    const jitter = (Math.random() - 0.5) * 28;
    const nextRotation = wheelRotation + 360 * 6 + delta + jitter;
    setWheelRotation(nextRotation);

    setTimeout(() => {
      setIsSpinning(false);
      setLastWonBonus(result.sector!.bonusAmount);
      hapticNotification('success');
    }, 3200);
  };

  // Admin quick actions
  const handleAdjustBonuses = (delta: number) => {
    updateUserLoyalty(targetClientUser.id, { bonusDelta: delta });
    showToast(`${delta >= 0 ? '+' : ''}${delta} бонусов (${targetClientUser.first_name || targetClientUser.username})`);
  };

  const handleSetExactBonuses = (val: number) => {
    if (!Number.isFinite(val) || val < 0) return;
    updateUserLoyalty(targetClientUser.id, { bonusExact: Math.floor(val) });
    showToast(`Баланс установлен: ${Math.floor(val)} бонусов`);
  };

  const handleAdjustSpins = (delta: number) => {
    updateUserLoyalty(targetClientUser.id, { spinsDelta: delta });
    showToast(`${delta >= 0 ? '+' : ''}${delta} колесо (${targetClientUser.first_name || targetClientUser.username})`);
  };

  const handleSetExactSpins = (val: number) => {
    if (!Number.isFinite(val) || val < 0) return;
    updateUserLoyalty(targetClientUser.id, { spinsExact: Math.floor(val) });
    showToast(`Колёса установлены: ${Math.floor(val)} шт.`);
  };

  const handleAdjustSpend = (deltaByn: number) => {
    updateUserLoyalty(targetClientUser.id, {
      spentDeltaByn: deltaByn,
      autoGrantTierRewards,
    });
    showToast(
      `${deltaByn >= 0 ? '+' : ''}${deltaByn} BYN в уровень (${
        autoGrantTierRewards ? 'с авто-наградами уровней' : 'без наград'
      })`
    );
  };

  const handleSetExactSpend = (valByn: number) => {
    if (!Number.isFinite(valByn) || valByn < 0) return;
    updateUserLoyalty(targetClientUser.id, {
      spentExactByn: Math.round(valByn * 100) / 100,
      autoGrantTierRewards,
    });
    showToast(`Сумма покупок установлена: ${valByn} BYN`);
  };

  const handleGrantTierPack = (tier: LoyaltyTierConfig) => {
    updateUserLoyalty(targetClientUser.id, {
      bonusDelta: tier.welcomeBonuses,
      spinsDelta: tier.wheelSpins,
    });
    showToast(`Начислен пакет ${tier.title}: +${tier.welcomeBonuses} бонусов и +${tier.wheelSpins} колеса!`);
  };

  const handleCreateOrSelectUser = () => {
    const parsedId = Number(newUserIdInput.trim());
    if (!parsedId || !Number.isFinite(parsedId)) return;
    updateUserLoyalty(parsedId, {
      username: newUsernameInput.trim().replace(/^@/, '') || `user_${parsedId}`,
      first_name: newUsernameInput.trim() || `Клиент #${parsedId}`,
    });
    setSelectedUserId(parsedId);
    setNewUserIdInput('');
    setNewUsernameInput('');
    showToast(`Профиль ID ${parsedId} создан и выбран (+100 бонусов и 1 колесо BROZNE)`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-end sm:items-center justify-center p-0 sm:p-3 animate-fade-in">
      <div className="w-full max-w-[460px] h-[93vh] sm:h-[88vh] bg-[#0b0a14] border-t sm:border border-purple-500/30 rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden shadow-[0_0_50px_rgba(168,85,247,0.35)]">
        {/* Top Bar */}
        <div className="px-4 py-3.5 bg-gradient-to-r from-purple-950/80 via-[#151126] to-orange-950/60 border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-orange-500 flex items-center justify-center text-lg shadow-[0_0_15px_rgba(168,85,247,0.5)]">
              🎡
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-black text-white tracking-tight">ПРОГРАММА ЛОЯЛЬНОСТИ</h2>
                <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 border border-orange-500/40">
                  EXP
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">Бонусная система, уровни и Колесо Призов</p>
            </div>
          </div>

          <button
            onClick={() => {
              hapticImpact('light');
              onClose();
            }}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Switcher (Client View / Admin Control) */}
        <div className="px-4 pt-3 pb-2 bg-[#0e0c1a] border-b border-white/5 shrink-0">
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-black/50 rounded-2xl border border-white/10">
            <button
              onClick={() => {
                hapticSelection();
                setActiveMode('client');
              }}
              className={`py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all ${
                activeMode === 'client'
                  ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Колесо & Бонусы</span>
            </button>

            <button
              onClick={() => {
                hapticSelection();
                setActiveMode('admin');
              }}
              className={`py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all ${
                activeMode === 'admin'
                  ? 'bg-gradient-to-r from-orange-600 to-amber-500 text-white shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Админ-управление</span>
            </button>
          </div>

          {/* Active profile pill when testing different users */}
          <div className="mt-2 flex items-center justify-between text-[11px] px-1">
            <span className="text-zinc-400 truncate">
              Профиль:{' '}
              <strong className="text-white">
                {targetClientUser.first_name || 'Клиент'}
                {targetClientUser.username ? ` (@${targetClientUser.username})` : ''}
              </strong>{' '}
              <span className="text-zinc-500">#{targetClientUser.id}</span>
            </span>
            <span className={`font-black ${currentTier.accentClass}`}>
              {currentTier.badgeEmoji} {currentTier.title} ({userSpend.toFixed(0)} BYN)
            </span>
          </div>
        </div>

        {/* Toast feedback */}
        {adminToast && (
          <div className="mx-4 mt-2.5 px-3 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs font-bold flex items-center gap-2 animate-fade-in shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{adminToast}</span>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeMode === 'client' ? (
            <>
              {/* Current Tier & Balances Hero Card */}
              <div
                className={`p-4 rounded-3xl bg-gradient-to-br ${currentTier.gradientClass} border ${currentTier.borderClass} shadow-lg space-y-3.5`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-black/40 border border-white/10 text-[10px] font-extrabold uppercase tracking-wider text-zinc-200 mb-1">
                      <span>Ваш статус лояльности</span>
                    </div>
                    <h3 className="text-xl font-black text-white flex items-center gap-2">
                      <span>{currentTier.badgeEmoji}</span>
                      <span>{currentTier.title}</span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-white/10 text-zinc-200">
                        до {currentTier.maxDiscountPercent}% баллами
                      </span>
                    </h3>
                  </div>

                  {currentTier.freeCityDelivery && (
                    <div className="px-2.5 py-1 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-extrabold flex items-center gap-1">
                      <Truck className="w-3.5 h-3.5" />
                      <span>Доставка 0 BYN</span>
                    </div>
                  )}
                </div>

                {/* Balances Grid */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2.5 rounded-2xl bg-black/45 border border-white/10 text-center">
                    <div className="text-[10px] text-zinc-400 font-semibold">Баланс бонусов</div>
                    <div className="text-base font-black text-amber-300 mt-0.5">{userBonuses}</div>
                    <div className="text-[9px] text-zinc-400">
                      = {Math.floor(userBonuses / BONUS_PER_BYN_REDEEM)} BYN скидки
                    </div>
                  </div>

                  <div className="p-2.5 rounded-2xl bg-black/45 border border-white/10 text-center">
                    <div className="text-[10px] text-zinc-400 font-semibold">Колёса призов</div>
                    <div className="text-base font-black text-purple-300 mt-0.5">{userSpins} шт.</div>
                    <div className="text-[9px] text-zinc-400">доступно круток</div>
                  </div>

                  <div className="p-2.5 rounded-2xl bg-black/45 border border-white/10 text-center">
                    <div className="text-[10px] text-zinc-400 font-semibold">Сумма покупок</div>
                    <div className="text-base font-black text-white mt-0.5">{userSpend.toFixed(0)} BYN</div>
                    <div className="text-[9px] text-zinc-400">в профиле</div>
                  </div>
                </div>

                {/* Progress to Next Tier */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-[11px] font-semibold">
                    <span className="text-zinc-300">
                      {nextTier
                        ? `До уровня ${nextTier.badgeEmoji} ${nextTier.title}: осталось ${Math.max(
                            0,
                            nextTier.minSpendByn - userSpend
                          ).toFixed(0)} BYN`
                        : '👑 Максимальный уровень VIP достигнут!'}
                    </span>
                    <span className="text-white font-bold">{progressPercent}%</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-black/50 overflow-hidden p-0.5 border border-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-purple-500 via-fuchsia-500 to-amber-400 transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-zinc-400">
                    <span>✅ Приветственный бонус BROZNE (1 колесо + 100 бонусов) активен</span>
                    <span>1 BYN = 10 бонусов</span>
                  </div>
                </div>
              </div>

              {/* Prize Wheel Section */}
              <div className="p-4 rounded-3xl bg-[#121020] border border-purple-500/30 space-y-4 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                      <span>🎡 КОЛЕСО ПРИЗОВ</span>
                    </h3>
                    <p className="text-[11px] text-zinc-400">
                      Испытайте удачу и выиграйте от 50 до 1000 бонусов мгновенно!
                    </p>
                  </div>
                  <div className="px-3 py-1 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-200 text-xs font-black">
                    Круток: {userSpins}
                  </div>
                </div>

                {/* Visual Wheel */}
                <div className="relative w-64 h-64 mx-auto my-2 flex items-center justify-center">
                  {/* Top Pointer Arrow */}
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 drop-shadow-[0_4px_10px_rgba(0,0,0,0.9)]">
                    <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[20px] border-t-amber-400" />
                  </div>

                  {/* Rotating SVG Wheel */}
                  <div
                    className="w-full h-full rounded-full border-4 border-purple-400/50 shadow-[0_0_35px_rgba(168,85,247,0.4)] overflow-hidden relative"
                    style={{
                      transform: `rotate(${wheelRotation}deg)`,
                      transition: isSpinning ? 'transform 3.2s cubic-bezier(0.14, 0.85, 0.22, 1)' : 'none',
                    }}
                  >
                    <svg viewBox="0 0 200 200" className="w-full h-full">
                      {WHEEL_SECTORS.map((sector, idx) => {
                        const total = WHEEL_SECTORS.length;
                        const anglePerSlice = 360 / total;
                        const startAngle = idx * anglePerSlice - 90;
                        const endAngle = startAngle + anglePerSlice;

                        const startRad = (startAngle * Math.PI) / 180;
                        const endRad = (endAngle * Math.PI) / 180;

                        const x1 = 100 + 100 * Math.cos(startRad);
                        const y1 = 100 + 100 * Math.sin(startRad);
                        const x2 = 100 + 100 * Math.cos(endRad);
                        const y2 = 100 + 100 * Math.sin(endRad);

                        const midAngle = startAngle + anglePerSlice / 2;
                        const midRad = (midAngle * Math.PI) / 180;
                        const textX = 100 + 62 * Math.cos(midRad);
                        const textY = 100 + 62 * Math.sin(midRad);

                        return (
                          <g key={sector.id}>
                            <path
                              d={`M 100 100 L ${x1} ${y1} A 100 100 0 0 1 ${x2} ${y2} Z`}
                              fill={sector.color}
                              stroke="#0b0a14"
                              strokeWidth="2"
                            />
                            <g transform={`translate(${textX}, ${textY}) rotate(${midAngle + 90})`}>
                              <text
                                x="0"
                                y="-4"
                                textAnchor="middle"
                                fill="#ffffff"
                                fontSize="13"
                                fontWeight="900"
                              >
                                +{sector.bonusAmount}
                              </text>
                              <text
                                x="0"
                                y="8"
                                textAnchor="middle"
                                fill="rgba(255,255,255,0.8)"
                                fontSize="7"
                                fontWeight="700"
                              >
                                БОНУСОВ
                              </text>
                            </g>
                          </g>
                        );
                      })}
                    </svg>
                  </div>

                  {/* Center Hub */}
                  <div className="absolute w-14 h-14 rounded-full bg-[#0e0c1a] border-4 border-amber-400 shadow-xl flex items-center justify-center text-lg z-10">
                    🎁
                  </div>
                </div>

                {/* Win Result Banner */}
                {lastWonBonus !== null && (
                  <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-purple-500/20 border border-amber-400/50 text-center animate-fade-in">
                    <div className="text-xs font-bold text-amber-300 uppercase">Поздравляем! Вы выиграли:</div>
                    <div className="text-xl font-black text-white mt-0.5">
                      +{lastWonBonus} бонусов ({lastWonBonus / 100} BYN)
                    </div>
                  </div>
                )}

                {spinError && (
                  <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-xs text-red-300 text-center">
                    {spinError}
                  </div>
                )}

                {/* Spin Button */}
                <button
                  onClick={handleSpinWheel}
                  disabled={isSpinning || userSpins <= 0}
                  className="w-full py-3.5 px-4 rounded-2xl font-black text-sm text-white bg-gradient-to-r from-purple-600 via-fuchsia-600 to-orange-500 shadow-[0_0_25px_rgba(168,85,247,0.5)] hover:shadow-[0_0_35px_rgba(249,115,22,0.6)] transition-all disabled:opacity-40 tap-active"
                >
                  {isSpinning
                    ? 'Крутим колесо удачи...'
                    : userSpins > 0
                    ? `КРУТИТЬ КОЛЕСО (доступно: ${userSpins})`
                    : 'НЕТ ДОСТУПНЫХ КОЛЁС'}
                </button>

                {/* Wheel Chances Table */}
                <div className="pt-2 border-t border-white/10">
                  <div className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider mb-2">
                    Шансы и выигрыши в колесе:
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {WHEEL_SECTORS.map((s) => (
                      <div
                        key={s.id}
                        className="p-2 rounded-xl bg-black/40 border border-white/10 text-center flex flex-col items-center"
                      >
                        <span
                          className="w-2 h-2 rounded-full mb-1"
                          style={{ backgroundColor: s.color }}
                        />
                        <span className="text-xs font-black text-white">+{s.bonusAmount}</span>
                        <span className="text-[9px] text-zinc-400">бонусов</span>
                        <span className="text-[10px] font-extrabold text-purple-300 mt-0.5">
                          {s.chancePercent}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Key Rules Card */}
              <div className="p-4 rounded-3xl bg-white/[0.03] border border-white/10 space-y-2.5">
                <h4 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-amber-400" />
                  <span>Правила начисления и списания бонусов</span>
                </h4>
                <div className="space-y-2 text-xs text-zinc-300">
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
                    <span>Кэшбэк за каждую покупку:</span>
                    <strong className="text-emerald-400">1 BYN = {BONUS_PER_BYN_EARNED} бонусов</strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
                    <span>Пример: заказ на 100 руб</span>
                    <strong className="text-purple-300">= +1000 бонусов</strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
                    <span>Шаг оплаты бонусами (без копеек):</span>
                    <strong className="text-amber-300">кратно 100 шт = 1 BYN</strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
                    <span>Оплата доставки бонусами:</span>
                    <strong className="text-orange-300">
                      {DELIVERY_PRICE_BYN} BYN = {DELIVERY_BONUS_COST} бонусов
                    </strong>
                  </div>
                </div>
              </div>

              {/* All 5 Loyalty Tiers Table */}
              <div className="p-4 rounded-3xl bg-white/[0.03] border border-white/10 space-y-3">
                <h4 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Crown className="w-4 h-4 text-amber-400" />
                  <span>Уровни программы лояльности</span>
                </h4>

                <div className="space-y-2">
                  {LOYALTY_TIERS.map((t) => {
                    const isCurrent = t.id === currentTier.id;
                    const isUnlocked = userSpend >= t.minSpendByn;
                    return (
                      <div
                        key={t.id}
                        className={`p-3 rounded-2xl border transition-all ${
                          isCurrent
                            ? `bg-gradient-to-r ${t.gradientClass} ${t.borderClass} shadow-md`
                            : 'bg-black/40 border-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{t.badgeEmoji}</span>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-black text-white">{t.title}</span>
                                <span className="text-[10px] font-bold text-zinc-300">
                                  ({t.maxSpendByn ? `от ${t.minSpendByn} до ${t.maxSpendByn}` : `${t.minSpendByn}+`} BYN)
                                </span>
                              </div>
                              <div className="text-[11px] text-zinc-200 mt-0.5">
                                🎡 {t.wheelSpins} {t.wheelSpins === 1 ? 'колесо' : 'колеса'} + 🎁 {t.welcomeBonuses}{' '}
                                бонусов + снятие до <strong>{t.maxDiscountPercent}%</strong>
                              </div>
                              {t.freeCityDelivery && (
                                <div className="text-[10px] font-bold text-emerald-300 mt-0.5">
                                  🚚 + Бесплатная доставка на любой заказ в пределах города
                                </div>
                              )}
                            </div>
                          </div>

                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-lg ${
                              isCurrent
                                ? 'bg-white text-black'
                                : isUnlocked
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-white/5 text-zinc-500'
                            }`}
                          >
                            {isCurrent ? 'ТЕКУЩИЙ' : isUnlocked ? 'ОТКРЫТ' : 'ЗАКРЫТ'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            /* ================= ADMIN MANAGEMENT TAB ================= */
            <div className="space-y-4">
              {/* Sync from Orders + Quick Create User */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-orange-950/40 to-purple-950/40 border border-orange-500/30 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-black text-white uppercase">Синхронизация базы клиентов</h3>
                    <p className="text-[11px] text-zinc-400">
                      Пересчитать рубли уровней из выполненных заказов
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      const count = syncUsersSpendFromOrders();
                      showToast(`Синхронизировано профилей из заказов: ${count}`);
                    }}
                    className="py-2 px-3 rounded-xl bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/40 text-orange-200 text-xs font-extrabold flex items-center gap-1.5 shrink-0 tap-active-sm"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Синхронизировать</span>
                  </button>
                </div>

                {/* Add / Find User by Telegram ID */}
                <div className="pt-2 border-t border-white/10 flex gap-1.5">
                  <input
                    type="number"
                    value={newUserIdInput}
                    onChange={(e) => setNewUserIdInput(e.target.value)}
                    placeholder="Telegram ID (напр. 5829104)"
                    className="w-1/2 py-2 px-2.5 rounded-xl bg-black/50 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                  />
                  <input
                    type="text"
                    value={newUsernameInput}
                    onChange={(e) => setNewUsernameInput(e.target.value)}
                    placeholder="@username / Имя"
                    className="flex-1 py-2 px-2.5 rounded-xl bg-black/50 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                  />
                  <button
                    onClick={handleCreateOrSelectUser}
                    className="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shrink-0 flex items-center gap-1"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>+</span>
                  </button>
                </div>
              </div>

              {/* User Selector List */}
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-zinc-300 uppercase">
                    Выберите клиента ({filteredUsers.length})
                  </span>
                  <button
                    onClick={() => setSelectedUserId(currentLoyaltyUser.id)}
                    className="text-[11px] font-bold text-purple-400 hover:text-purple-300"
                  >
                    Выбрать мой профиль
                  </button>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Поиск по имени, @username или Telegram ID..."
                    className="w-full py-2 pl-8 pr-3 rounded-xl bg-black/50 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                  {filteredUsers.map((u) => {
                    const uTier = getLoyaltyTierBySpend(u.total_spent_byn || 0);
                    const isSel = Number(u.id) === Number(targetClientUser.id);
                    return (
                      <button
                        key={u.id}
                        onClick={() => {
                          hapticSelection();
                          setSelectedUserId(u.id);
                        }}
                        className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                          isSel
                            ? 'bg-purple-600/25 border-purple-400 text-white'
                            : 'bg-black/40 border-white/5 text-zinc-300 hover:bg-white/5'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate">
                            {u.first_name || 'Клиент'} {u.username ? `(@${u.username})` : ''}
                          </div>
                          <div className="text-[10px] text-zinc-400">
                            ID: {u.id} • {uTier.badgeEmoji} {uTier.title} ({Number(u.total_spent_byn || 0).toFixed(0)}{' '}
                            BYN)
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <div className="text-xs font-extrabold text-amber-300">
                            {u.bonus_balance ?? 100} бон.
                          </div>
                          <div className="text-[10px] text-purple-300">🎡 {u.wheel_spins ?? 1} шт.</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 1. Управление БОНУСАМИ */}
              <div className="p-4 rounded-2xl bg-[#141122] border border-amber-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-black text-white uppercase">1. Управление бонусами</span>
                  </div>
                  <span className="text-sm font-black text-amber-300">
                    Сейчас: {userBonuses} бон. ({Math.floor(userBonuses / 100)} BYN)
                  </span>
                </div>

                {/* Quick 1-click buttons */}
                <div className="grid grid-cols-4 gap-1.5">
                  {[100, 200, 500, 1000].map((amt) => (
                    <button
                      key={`add-${amt}`}
                      onClick={() => handleAdjustBonuses(amt)}
                      className="py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-extrabold tap-active-sm"
                    >
                      +{amt}
                    </button>
                  ))}
                  {[-100, -200, -500].map((amt) => (
                    <button
                      key={`sub-${amt}`}
                      onClick={() => handleAdjustBonuses(amt)}
                      className="py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 text-xs font-extrabold tap-active-sm"
                    >
                      {amt}
                    </button>
                  ))}
                  <button
                    onClick={() => handleSetExactBonuses(0)}
                    className="py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-white/10 text-zinc-300 text-xs font-bold tap-active-sm"
                  >
                    Сброс 0
                  </button>
                </div>

                {/* Custom bonus input */}
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    value={customBonusInput}
                    onChange={(e) => setCustomBonusInput(e.target.value)}
                    placeholder="Кол-во бонусов..."
                    className="flex-1 py-2 px-3 rounded-xl bg-black/50 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
                  />
                  <button
                    onClick={() => {
                      const v = Number(customBonusInput);
                      if (v) handleAdjustBonuses(Math.abs(v));
                      setCustomBonusInput('');
                    }}
                    className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold"
                  >
                    + Начислить
                  </button>
                  <button
                    onClick={() => {
                      const v = Number(customBonusInput);
                      if (v) handleAdjustBonuses(-Math.abs(v));
                      setCustomBonusInput('');
                    }}
                    className="px-3 py-2 rounded-xl bg-red-600 text-white text-xs font-bold"
                  >
                    − Списать
                  </button>
                  <button
                    onClick={() => {
                      const v = Number(customBonusInput);
                      if (Number.isFinite(v) && customBonusInput !== '') handleSetExactBonuses(v);
                      setCustomBonusInput('');
                    }}
                    className="px-2.5 py-2 rounded-xl bg-white/10 text-zinc-200 text-xs font-bold"
                  >
                    = Задать
                  </button>
                </div>
              </div>

              {/* 2. Управление КОЛЁСАМИ (крутками) */}
              <div className="p-4 rounded-2xl bg-[#141122] border border-purple-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Gift className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-black text-white uppercase">2. Управление колёсами (крутками)</span>
                  </div>
                  <span className="text-sm font-black text-purple-300">Сейчас: {userSpins} шт.</span>
                </div>

                <div className="grid grid-cols-5 gap-1.5">
                  <button
                    onClick={() => handleAdjustSpins(1)}
                    className="py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-200 text-xs font-extrabold tap-active-sm"
                  >
                    +1 🎡
                  </button>
                  <button
                    onClick={() => handleAdjustSpins(2)}
                    className="py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-200 text-xs font-extrabold tap-active-sm"
                  >
                    +2 🎡
                  </button>
                  <button
                    onClick={() => handleAdjustSpins(3)}
                    className="py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-200 text-xs font-extrabold tap-active-sm"
                  >
                    +3 🎡
                  </button>
                  <button
                    onClick={() => handleAdjustSpins(-1)}
                    className="py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 text-xs font-extrabold tap-active-sm"
                  >
                    −1 🎡
                  </button>
                  <button
                    onClick={() => handleSetExactSpins(0)}
                    className="py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-white/10 text-zinc-300 text-xs font-bold tap-active-sm"
                  >
                    Сброс 0
                  </button>
                </div>

                <div className="flex gap-1.5">
                  <input
                    type="number"
                    value={customSpinsInput}
                    onChange={(e) => setCustomSpinsInput(e.target.value)}
                    placeholder="Кол-во колёс..."
                    className="flex-1 py-2 px-3 rounded-xl bg-black/50 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-400"
                  />
                  <button
                    onClick={() => {
                      const v = Number(customSpinsInput);
                      if (v) handleAdjustSpins(Math.abs(v));
                      setCustomSpinsInput('');
                    }}
                    className="px-3 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold"
                  >
                    + Добавить
                  </button>
                  <button
                    onClick={() => {
                      const v = Number(customSpinsInput);
                      if (Number.isFinite(v) && customSpinsInput !== '') handleSetExactSpins(v);
                      setCustomSpinsInput('');
                    }}
                    className="px-3 py-2 rounded-xl bg-white/10 text-zinc-200 text-xs font-bold"
                  >
                    = Задать
                  </button>
                </div>
              </div>

              {/* 3. Управление РУБЛЯМИ (BYN) для уровня */}
              <div className="p-4 rounded-2xl bg-[#141122] border border-emerald-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-black text-white uppercase">3. Рубли в профиль (для уровня)</span>
                  </div>
                  <span className="text-sm font-black text-emerald-300">
                    {userSpend.toFixed(0)} BYN ({currentTier.title})
                  </span>
                </div>

                <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoGrantTierRewards}
                    onChange={(e) => setAutoGrantTierRewards(e.target.checked)}
                    className="rounded accent-purple-500"
                  />
                  <span>Авто-начислять бонусы и колёса при переходе на новый уровень</span>
                </label>

                {/* Quick level jump buttons */}
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    onClick={() => handleSetExactSpend(0)}
                    className="py-2 px-2 rounded-xl bg-amber-900/30 border border-amber-500/30 text-amber-200 text-[11px] font-bold tap-active-sm"
                  >
                    🥉 0 BYN (BROZNE)
                  </button>
                  <button
                    onClick={() => handleSetExactSpend(100)}
                    className="py-2 px-2 rounded-xl bg-zinc-700/40 border border-zinc-400/30 text-zinc-200 text-[11px] font-bold tap-active-sm"
                  >
                    🥈 100 BYN (SILVER)
                  </button>
                  <button
                    onClick={() => handleSetExactSpend(250)}
                    className="py-2 px-2 rounded-xl bg-yellow-600/25 border border-yellow-400/40 text-yellow-200 text-[11px] font-bold tap-active-sm"
                  >
                    🥇 250 BYN (GOLD)
                  </button>
                  <button
                    onClick={() => handleSetExactSpend(500)}
                    className="py-2 px-2 rounded-xl bg-cyan-600/25 border border-cyan-400/40 text-cyan-200 text-[11px] font-bold tap-active-sm"
                  >
                    💎 500 BYN (PLATINUM)
                  </button>
                  <button
                    onClick={() => handleSetExactSpend(1000)}
                    className="py-2 px-2 rounded-xl bg-purple-600/30 border border-purple-400/40 text-purple-200 text-[11px] font-bold tap-active-sm"
                  >
                    👑 1000 BYN (VIP)
                  </button>
                  <button
                    onClick={() => handleAdjustSpend(50)}
                    className="py-2 px-2 rounded-xl bg-emerald-600/25 border border-emerald-400/40 text-emerald-200 text-[11px] font-extrabold tap-active-sm"
                  >
                    +50 BYN к сумме
                  </button>
                </div>

                {/* Custom rubles input */}
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    value={customRublesInput}
                    onChange={(e) => setCustomRublesInput(e.target.value)}
                    placeholder="Сумма в рублях (BYN)..."
                    className="flex-1 py-2 px-3 rounded-xl bg-black/50 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-400"
                  />
                  <button
                    onClick={() => {
                      const v = Number(customRublesInput);
                      if (v) handleAdjustSpend(Math.abs(v));
                      setCustomRublesInput('');
                    }}
                    className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold"
                  >
                    + Добавить BYN
                  </button>
                  <button
                    onClick={() => {
                      const v = Number(customRublesInput);
                      if (v) handleAdjustSpend(-Math.abs(v));
                      setCustomRublesInput('');
                    }}
                    className="px-3 py-2 rounded-xl bg-red-600 text-white text-xs font-bold"
                  >
                    − Убрать
                  </button>
                  <button
                    onClick={() => {
                      const v = Number(customRublesInput);
                      if (Number.isFinite(v) && customRublesInput !== '') handleSetExactSpend(v);
                      setCustomRublesInput('');
                    }}
                    className="px-2.5 py-2 rounded-xl bg-white/10 text-zinc-200 text-xs font-bold"
                  >
                    = Задать
                  </button>
                </div>
              </div>

              {/* 4. Начислить пакет наград любого уровня в 1 клик */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2.5">
                <span className="text-xs font-extrabold text-zinc-300 uppercase block">
                  Выдать бонусный пакет уровня вручную (1 клик):
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {LOYALTY_TIERS.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => handleGrantTierPack(t)}
                      className="p-2.5 rounded-xl bg-black/40 hover:bg-white/10 border border-white/10 text-left transition-all tap-active-sm"
                    >
                      <div className="text-xs font-black text-white">
                        {t.badgeEmoji} Пакет {t.title}
                      </div>
                      <div className="text-[10px] text-purple-300">
                        +{t.wheelSpins} кол. и +{t.welcomeBonuses} бон.
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
