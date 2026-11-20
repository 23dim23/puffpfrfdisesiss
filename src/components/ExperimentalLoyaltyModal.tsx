import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  Search,
  RefreshCw,
  CheckCircle2,
  UserPlus,
  Sliders,
  HelpCircle,
  ChevronRight,
  ChevronDown,
  History,
  Plus,
  Minus,
} from 'lucide-react';
import { hapticImpact, hapticNotification, hapticSelection } from '../services/telegram';
import { ShopUser } from '../types';

interface ExperimentalLoyaltyModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'client' | 'admin';
}

type HelpTopicId = 'bonuses' | 'spins' | 'spend' | 'wheel' | null;

const HELP_CONTENT: Record<
  Exclude<HelpTopicId, null>,
  {
    title: string;
    subtitle: string;
    bullets: { heading: string; text: string }[];
    example: string;
  }
> = {
  bonuses: {
    title: 'Как работают бонусы клиента',
    subtitle: 'Внутренние баллы, которыми покупатель оплачивает часть заказа или доставку.',
    bullets: [
      {
        heading: 'Курс списания: 100 бонусов = 1 BYN',
        text: 'Оплачивать можно только целыми рублями (100, 200, 300 бон.). Копейки списать нельзя.',
      },
      {
        heading: 'Лимит скидки зависит от уровня',
        text: 'BROZNE — до 5%, SILVER — до 7%, GOLD — до 10%, PLATINUM и VIP — до 12% от суммы заказа.',
      },
      {
        heading: 'Кэшбэк за каждую покупку',
        text: 'Автоматически начисляется 10 бонусов за каждый 1 BYN (заказ на 100 BYN → +1000 бонусов).',
      },
      {
        heading: 'Оплата доставки бонусами',
        text: 'Доставку 5 BYN клиент может полностью оплатить за 500 бонусов.',
      },
    ],
    example:
      'Выберите действие («Начислить», «Списать» или «Задать точно»), введите число или нажмите быструю сумму, затем подтвердите кнопкой внизу блока.',
  },
  spins: {
    title: 'Как работают колёса (крутки)',
    subtitle: 'Попытки вращения Колеса призов, в котором выпадают бонусы.',
    bullets: [
      {
        heading: '1 крутка = 1 вращение колеса',
        text: 'При нажатии «Крутить колесо» списывается 1 крутка, а выигранные бонусы мгновенно зачисляются на счёт клиента.',
      },
      {
        heading: 'Возможные выигрыши в колесе',
        text: 'На колесе 5 призовых секторов: +50, +100, +200, +500 и +1000 бонусов.',
      },
      {
        heading: 'Откуда крутки берутся сами',
        text: 'При входе каждый новый клиент получает 1 приветственную крутку (BROZNE), а далее при росте уровня: SILVER (+2), GOLD (+2), PLATINUM (+3), VIP (+3).',
      },
    ],
    example:
      'Чтобы выдать клиенту крутку за конкурс или крупный заказ — нажмите «+1» или «+3». Чтобы сразу проверить вращение — нажмите «Проверить в колесе».',
  },
  spend: {
    title: 'Зачем нужны рубли (BYN) в профиле',
    subtitle: 'Это счётчик общей суммы покупок клиента, по которому определяется его уровень.',
    bullets: [
      {
        heading: 'Это НЕ деньги на балансе',
        text: 'Клиент не может потратить эти рубли — они показывают, на какую сумму он уже купил в магазине, и открывают новый статус:',
      },
      {
        heading: 'Шкала уровней (BYN)',
        text: 'BROZNE: 0–99 · SILVER: 100–249 · GOLD: 250–499 · PLATINUM: 500–999 · VIP: 1000+ (плюс бесплатная доставка по городу).',
      },
      {
        heading: 'Автоматический рост и подарки',
        text: 'При выполнении заказов сумма растёт сама. Если включена галочка «Авто-подарки», при переходе на новый уровень клиент сразу получит бонусы и крутки этого уровня.',
      },
    ],
    example:
      'Если постоянный клиент раньше покупал у вас в чате на 300 BYN — нажмите кнопку «GOLD (250 BYN)» или добавьте +300 BYN, чтобы сразу присвоить ему статус GOLD.',
  },
  wheel: {
    title: 'Как работает Колесо призов',
    subtitle: 'Крутите колесо и выигрывайте бонусные баллы для оплаты заказов и доставки.',
    bullets: [
      {
        heading: 'Как получить крутки',
        text: '1 приветственную крутку вы получаете сразу на стартовом уровне BROZNE. Новые крутки начисляются автоматически при переходе на следующий уровень лояльности.',
      },
      {
        heading: 'Мгновенное зачисление приза',
        text: 'За один запуск используется 1 крутка, а выигранные бонусы сразу зачисляются на ваш баланс.',
      },
      {
        heading: 'Как потратить бонусы',
        text: '100 бонусов = 1 BYN. Бонусами можно оплатить часть заказа в корзине (в пределах лимита вашего уровня) или полностью оплатить доставку за 500 бонусов.',
      },
    ],
    example:
      'Нажмите «Крутить колесо» — стрелка укажет на ваш приз, и бонусы сразу станут доступны при оформлении заказа.',
  },
};

export const ExperimentalLoyaltyModal: React.FC<ExperimentalLoyaltyModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'client',
}) => {
  const {
    currentLoyaltyUser,
    users,
    isAdmin,
    spinWheelForUser,
    updateUserLoyalty,
    syncUsersSpendFromOrders,
  } = useStore();

  const [activeMode, setActiveMode] = useState<'client' | 'admin'>(initialMode);
  const [helpTopic, setHelpTopic] = useState<HelpTopicId>(null);

  // Wheel animation state
  const [isSpinning, setIsSpinning] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [lastWonBonus, setLastWonBonus] = useState<number | null>(null);
  const [spinError, setSpinError] = useState<string | null>(null);
  const spinTimerRef = useRef<number | null>(null);

  // Client picker state
  const [selectedUserId, setSelectedUserId] = useState<number>(() => currentLoyaltyUser?.id || 999999);
  const [isUserPickerOpen, setIsUserPickerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUserIdInput, setNewUserIdInput] = useState('');
  const [newUsernameInput, setNewUsernameInput] = useState('');

  // Section 1: Bonuses intuitive state
  const [bonusActionMode, setBonusActionMode] = useState<'add' | 'subtract' | 'set'>('add');
  const [bonusAmountInput, setBonusAmountInput] = useState<string>('100');

  // Section 2: Spins intuitive state
  const [spinCustomInput, setSpinCustomInput] = useState<string>('1');

  // Section 3: Spend / Level intuitive state
  const [spendAddInput, setSpendAddInput] = useState<string>('100');
  const [autoGrantTierRewards, setAutoGrantTierRewards] = useState(true);

  // Feedback toast
  const [adminToast, setAdminToast] = useState<string | null>(null);

  // Clean up spin timer on unmount
  useEffect(() => {
    return () => {
      if (spinTimerRef.current) {
        window.clearTimeout(spinTimerRef.current);
      }
    };
  }, []);

  // Sync initialMode whenever modal opens; regular customers are strictly locked to client mode
  useEffect(() => {
    if (isOpen) {
      setActiveMode(isAdmin ? initialMode : 'client');
    }
  }, [isOpen, initialMode, isAdmin]);

  // Ensure selectedUserId points to a valid user when modal opens
  useEffect(() => {
    if (isOpen && currentLoyaltyUser?.id) {
      const exists = users.some((u) => Number(u.id) === Number(selectedUserId));
      if (!exists) {
        setSelectedUserId(currentLoyaltyUser.id);
      }
    }
  }, [isOpen, currentLoyaltyUser?.id, users, selectedUserId]);

  // Reset transient spin messages when switching target user
  useEffect(() => {
    setLastWonBonus(null);
    setSpinError(null);
  }, [selectedUserId]);

  // Active target user (regular customers always see ONLY their own Telegram profile)
  const targetClientUser: ShopUser = useMemo(() => {
    if (!isAdmin) return currentLoyaltyUser;
    const found = users.find((u) => Number(u.id) === Number(selectedUserId));
    return found || currentLoyaltyUser;
  }, [isAdmin, users, selectedUserId, currentLoyaltyUser]);

  const userSpend = Math.max(0, Number(targetClientUser?.total_spent_byn) || 0);
  const userBonuses = Math.max(0, Math.floor(Number(targetClientUser?.bonus_balance ?? 0)));
  const userSpins = Math.max(0, Math.floor(Number(targetClientUser?.wheel_spins ?? 0)));
  const spinHistory = targetClientUser?.spin_history || [];

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

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setAdminToast(msg);
    window.setTimeout(() => {
      setAdminToast((prev) => (prev === msg ? null : prev));
    }, 3000);
  };

  // ================= WHEEL SPIN HANDLER =================
  const handleSpinWheel = () => {
    if (isSpinning) return;
    setSpinError(null);
    setLastWonBonus(null);

    if (userSpins <= 0) {
      setSpinError('У вас пока нет доступных круток. Совершайте покупки и повышайте уровень, чтобы получать новые прокруты!');
      hapticNotification('error');
      return;
    }

    hapticImpact('heavy');
    const result = spinWheelForUser(targetClientUser.id);
    if (!result.success) {
      setSpinError(result.error || 'Не удалось прокрутить колесо');
      hapticNotification('error');
      return;
    }

    const sectorIndex = Math.max(
      0,
      WHEEL_SECTORS.findIndex((s) => s.id === (result.sector?.id || result.sectorId))
    );
    const wonAmount = result.wonBonuses;

    setIsSpinning(true);

    // 5 visual slices of 72 degrees each (360 / 5 = 72 deg)
    const sliceAngle = 360 / WHEEL_SECTORS.length;
    const targetNormalizedAngle = (360 - (sectorIndex * sliceAngle + sliceAngle / 2)) % 360;
    const currentMod = ((wheelRotation % 360) + 360) % 360;
    let delta = targetNormalizedAngle - currentMod;
    if (delta < 0) delta += 360;

    // 6 full rotations + slight jitter inside the winning slice (±14 deg inside ±36 deg slice)
    const jitter = (Math.random() - 0.5) * 28;
    const nextRotation = wheelRotation + 360 * 6 + delta + jitter;
    setWheelRotation(nextRotation);

    if (spinTimerRef.current) {
      window.clearTimeout(spinTimerRef.current);
    }
    spinTimerRef.current = window.setTimeout(() => {
      setIsSpinning(false);
      setLastWonBonus(wonAmount);
      hapticNotification('success');
      showToast(`Выигрыш +${wonAmount} бонусов зачислен на баланс!`);
    }, 3200);
  };

  // ================= SECTION 1: BONUSES =================
  const parsedBonusVal = Math.max(0, Math.floor(Number(bonusAmountInput) || 0));
  const previewBonusesAfter =
    bonusActionMode === 'add'
      ? userBonuses + parsedBonusVal
      : bonusActionMode === 'subtract'
      ? Math.max(0, userBonuses - parsedBonusVal)
      : parsedBonusVal;

  const handleApplyBonusAction = () => {
    if (bonusActionMode !== 'set' && parsedBonusVal <= 0) {
      showToast('Введите количество бонусов больше 0');
      return;
    }
    if (bonusActionMode === 'add') {
      updateUserLoyalty(targetClientUser.id, { deltaBonuses: parsedBonusVal });
      showToast(`Начислено +${parsedBonusVal} бонусов (${targetClientUser.first_name || targetClientUser.username})`);
    } else if (bonusActionMode === 'subtract') {
      updateUserLoyalty(targetClientUser.id, { deltaBonuses: -parsedBonusVal });
      showToast(`Списано −${parsedBonusVal} бонусов (${targetClientUser.first_name || targetClientUser.username})`);
    } else {
      updateUserLoyalty(targetClientUser.id, { setBonuses: parsedBonusVal });
      showToast(`Баланс установлен: ${parsedBonusVal} бонусов`);
    }
  };

  // ================= SECTION 2: SPINS =================
  const handleAdjustSpins = (delta: number) => {
    updateUserLoyalty(targetClientUser.id, { deltaSpins: delta });
    setSpinError(null);
    showToast(
      `${delta >= 0 ? `Добавлено +${delta}` : `Убрано ${delta}`} крут. (${
        targetClientUser.first_name || targetClientUser.username
      })`
    );
  };

  const handleSetExactSpins = (val: number) => {
    const clean = Math.max(0, Math.floor(val));
    updateUserLoyalty(targetClientUser.id, { setSpins: clean });
    setSpinError(null);
    showToast(`Установлено круток: ${clean} шт.`);
  };

  // ================= SECTION 3: SPEND & LEVEL =================
  const handleAdjustSpend = (deltaByn: number) => {
    const updated = updateUserLoyalty(targetClientUser.id, {
      deltaSpentByn: deltaByn,
      autoGrantTierRewards,
    });
    const newTier = getLoyaltyTierBySpend(updated.total_spent_byn || 0);
    showToast(
      `${deltaByn >= 0 ? '+' : ''}${deltaByn} BYN → всего ${updated.total_spent_byn} BYN (уровень ${newTier.title})`
    );
  };

  const handleSelectTierDirectly = (tier: LoyaltyTierConfig) => {
    const updated = updateUserLoyalty(targetClientUser.id, {
      setSpentByn: tier.minSpendByn,
      autoGrantTierRewards,
    });
    showToast(
      `Уровень ${tier.title} (${updated.total_spent_byn} BYN) установлен${
        autoGrantTierRewards ? ' с авто-подарками' : ''
      }`
    );
  };

  const handleCreateOrSelectUser = () => {
    const parsedId = Number(newUserIdInput.trim());
    if (!parsedId || !Number.isFinite(parsedId)) {
      showToast('Введите корректный числовой Telegram ID');
      return;
    }
    const cleanName = newUsernameInput.trim();
    updateUserLoyalty(parsedId, {
      username: cleanName.replace(/^@/, '') || `user_${parsedId}`,
      first_name: cleanName || `Клиент #${parsedId}`,
    });
    setSelectedUserId(parsedId);
    setNewUserIdInput('');
    setNewUsernameInput('');
    setShowCreateUser(false);
    setIsUserPickerOpen(false);
    showToast(`Профиль #${parsedId} создан (+100 бонусов и 1 крутка BROZNE)`);
  };

  const activeHelp = helpTopic ? HELP_CONTENT[helpTopic] : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-end sm:items-center justify-center p-0 sm:p-3 animate-fade-in">
      <div className="w-full max-w-[460px] h-[94vh] sm:h-[90vh] bg-[#0c0b15] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl relative">
        {/* Top Header */}
        <div className="px-4 py-3.5 bg-[#121022] border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-white tracking-tight truncate">
              Лояльность и Колесо призов
            </h2>
            <p className="text-[11px] text-zinc-400 truncate">
              {activeMode === 'admin'
                ? 'Панель управления программой лояльности'
                : 'Копите бонусы, повышайте уровень и выигрывайте призы'}
            </p>
          </div>

          <button
            onClick={() => {
              hapticImpact('light');
              onClose();
            }}
            aria-label="Закрыть"
            className="min-w-[40px] min-h-[40px] rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Active Client Strip + Mode Switcher (Admins only) */}
        {isAdmin && (
        <div className="px-4 pt-3 pb-3 bg-[#100e1d] border-b border-white/10 space-y-2.5 shrink-0">
          {/* Active Client Quick Bar (clickable to switch user from ANY tab) */}
          <button
            type="button"
            onClick={() => {
              hapticSelection();
              setIsUserPickerOpen((v) => !v);
            }}
            className="w-full px-3 py-2.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 flex items-center justify-between gap-2 text-left transition-colors"
          >
            <div className="min-w-0">
              <div className="text-[11px] text-zinc-400">Выбранный клиент</div>
              <div className="text-xs font-bold text-white truncate">
                {targetClientUser.first_name || 'Клиент'}
                {targetClientUser.username ? ` · @${targetClientUser.username}` : ''}{' '}
                <span className="text-zinc-500 font-normal tabular-nums">#{targetClientUser.id}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="text-right tabular-nums">
                <div className="text-xs font-bold text-amber-300">{userBonuses} бон.</div>
                <div className="text-[10px] text-zinc-400">
                  {userSpins} крут. · {currentTier.title}
                </div>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-zinc-400 transition-transform ${
                  isUserPickerOpen ? 'rotate-180' : ''
                }`}
              />
            </div>
          </button>

          {/* Collapsible Client Picker Dropdown */}
          {isUserPickerOpen && (
            <div className="p-3 rounded-2xl bg-[#161428] border border-white/15 space-y-2.5 animate-fade-in">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-zinc-200">
                  Выберите клиента ({filteredUsers.length})
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      hapticSelection();
                      setSelectedUserId(currentLoyaltyUser.id);
                      setIsUserPickerOpen(false);
                      showToast('Выбран ваш профиль');
                    }}
                    className="text-[11px] font-semibold text-purple-300 hover:text-purple-200"
                  >
                    Мой профиль
                  </button>
                  <span className="text-zinc-600">·</span>
                  <button
                    type="button"
                    onClick={() => setShowCreateUser((v) => !v)}
                    className="text-[11px] font-semibold text-amber-300 hover:text-amber-200 flex items-center gap-1"
                  >
                    <UserPlus className="w-3 h-3" />
                    <span>Новый по ID</span>
                  </button>
                </div>
              </div>

              {showCreateUser && (
                <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 space-y-2">
                  <div className="grid grid-cols-2 gap-1.5">
                    <input
                      type="number"
                      value={newUserIdInput}
                      onChange={(e) => setNewUserIdInput(e.target.value)}
                      placeholder="Telegram ID"
                      className="py-2 px-2.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                    />
                    <input
                      type="text"
                      value={newUsernameInput}
                      onChange={(e) => setNewUsernameInput(e.target.value)}
                      placeholder="@username / Имя"
                      className="py-2 px-2.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleCreateOrSelectUser}
                    className="w-full py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold"
                  >
                    Создать и выбрать клиента
                  </button>
                </div>
              )}

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск по имени, @username или ID..."
                  className="w-full py-2 pl-8 pr-3 rounded-xl bg-black/50 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="max-h-44 overflow-y-auto space-y-1 pr-0.5">
                {filteredUsers.map((u) => {
                  const uTier = getLoyaltyTierBySpend(u.total_spent_byn || 0);
                  const isSel = Number(u.id) === Number(targetClientUser.id);
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => {
                        hapticSelection();
                        setSelectedUserId(u.id);
                        setIsUserPickerOpen(false);
                      }}
                      className={`w-full px-3 py-2.5 rounded-xl border text-left flex items-center justify-between transition-colors ${
                        isSel
                          ? 'bg-purple-600/25 border-purple-400/60 text-white'
                          : 'bg-black/35 border-white/5 text-zinc-300 hover:bg-white/5'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-semibold truncate">
                          {u.first_name || 'Клиент'} {u.username ? `(@${u.username})` : ''}
                        </div>
                        <div className="text-[11px] text-zinc-400 tabular-nums">
                          #{u.id} · {uTier.title} · {Number(u.total_spent_byn || 0).toFixed(0)} BYN
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-2 tabular-nums">
                        <div className="text-xs font-bold text-amber-300">{u.bonus_balance ?? 0} бон.</div>
                        <div className="text-[10px] text-purple-300">{u.wheel_spins ?? 0} крут.</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Segmented Mode Tabs */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-black/50 rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => {
                hapticSelection();
                setActiveMode('client');
              }}
              className={`min-h-[40px] px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
                activeMode === 'client'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Колесо и статус</span>
            </button>

            <button
              type="button"
              onClick={() => {
                hapticSelection();
                setActiveMode('admin');
              }}
              className={`min-h-[40px] px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
                activeMode === 'admin'
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Управление клиентом</span>
            </button>
          </div>
        </div>
        )}

        {/* Live Toast Banner */}
        {adminToast && (
          <div className="mx-4 mt-2.5 px-3.5 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-100 text-xs font-semibold flex items-center gap-2 shrink-0 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{adminToast}</span>
          </div>
        )}

        {/* Main Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {!isAdmin || activeMode === 'client' ? (
            <>
              {/* 1. Compact Status Summary Card */}
              <div
                className={`p-4 rounded-2xl bg-gradient-to-br ${currentTier.gradientClass} border ${currentTier.borderClass} space-y-3.5`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[11px] text-zinc-300">
                      Статус · скидка баллами до {currentTier.maxDiscountPercent}%
                    </div>
                    <h3 className="text-xl font-black text-white mt-0.5 flex items-center gap-2">
                      <span>{currentTier.badgeEmoji}</span>
                      <span>{currentTier.title}</span>
                    </h3>
                  </div>

                  {currentTier.freeCityDelivery && (
                    <div className="text-right text-[11px] font-semibold text-emerald-300 flex items-center gap-1">
                      <Truck className="w-3.5 h-3.5" />
                      <span>Доставка 0 BYN</span>
                    </div>
                  )}
                </div>

                {/* 3 Key Metrics */}
                <div className="grid grid-cols-3 gap-2 tabular-nums">
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/10">
                    <div className="text-[10px] text-zinc-400">Бонусы</div>
                    <div className="text-base font-black text-amber-300 mt-0.5">{userBonuses}</div>
                    <div className="text-[10px] text-zinc-400">
                      = {Math.floor(userBonuses / BONUS_PER_BYN_REDEEM)} BYN
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/10">
                    <div className="text-[10px] text-zinc-400">Крутки колеса</div>
                    <div className="text-base font-black text-purple-300 mt-0.5">{userSpins} шт.</div>
                    <div className="text-[10px] text-zinc-400">доступно</div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/10">
                    <div className="text-[10px] text-zinc-400 leading-tight">Общая сумма покупок</div>
                    <div className="text-base font-black text-white mt-1">{userSpend.toFixed(0)} BYN</div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] text-zinc-200 tabular-nums">
                    <span>
                      {nextTier
                        ? `До ${nextTier.title}: осталось ${Math.max(
                            0,
                            nextTier.minSpendByn - userSpend
                          ).toFixed(0)} BYN`
                        : 'Максимальный уровень VIP достигнут'}
                    </span>
                    <span className="font-bold">{progressPercent}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-black/50 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-purple-500 to-amber-400 transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* 2. Interactive Prize Wheel */}
              <div className="p-4 rounded-2xl bg-[#131122] border border-white/10 space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white">Колесо призов</h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Доступно круток: <strong className="text-purple-300 tabular-nums">{userSpins} шт.</strong>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setHelpTopic('wheel')}
                    className="min-h-[36px] px-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 text-xs font-medium flex items-center gap-1 shrink-0"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-purple-400" />
                    <span>Справка</span>
                  </button>
                </div>

                {/* Wheel SVG */}
                <div className="relative w-64 h-64 mx-auto my-1 flex items-center justify-center">
                  {/* Top Pointer */}
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-20 drop-shadow-[0_4px_10px_rgba(0,0,0,0.9)]">
                    <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[20px] border-t-amber-400" />
                  </div>

                  <div
                    className="w-full h-full rounded-full border-4 border-purple-400/50 shadow-[0_0_30px_rgba(124,58,237,0.35)] overflow-hidden relative"
                    style={{
                      transform: `rotate(${wheelRotation}deg)`,
                      transition: isSpinning
                        ? 'transform 3.2s cubic-bezier(0.14, 0.85, 0.22, 1)'
                        : 'none',
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
                              stroke="#0c0b15"
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
                                fill="rgba(255,255,255,0.85)"
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
                  <div className="absolute w-14 h-14 rounded-full bg-[#0c0b15] border-4 border-amber-400 shadow-xl flex items-center justify-center text-lg z-10">
                    🎁
                  </div>
                </div>

                {/* Result or Error */}
                {lastWonBonus !== null && (
                  <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-center animate-fade-in">
                    <div className="text-xs font-semibold text-emerald-300">Выигрыш зачислен!</div>
                    <div className="text-lg font-black text-white mt-0.5 tabular-nums">
                      +{lastWonBonus} бонусов ({(lastWonBonus / 100).toFixed(2)} BYN)
                    </div>
                  </div>
                )}

                {spinError && (
                  <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-xs text-red-200 text-center">
                    {spinError}
                  </div>
                )}

                {/* Spin CTA */}
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleSpinWheel}
                    disabled={isSpinning || userSpins <= 0}
                    className="w-full min-h-[48px] px-4 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-purple-600 via-fuchsia-600 to-orange-500 shadow-lg transition-transform active:scale-[0.98] disabled:opacity-40"
                  >
                    {isSpinning
                      ? 'Колесо крутится...'
                      : userSpins > 0
                      ? `Крутить колесо (осталось: ${userSpins})`
                      : 'Нет доступных круток'}
                  </button>

                  {userSpins === 0 && !isSpinning && (
                    <p className="text-[11px] text-zinc-400 text-center px-2">
                      Новые крутки начисляются автоматически при переходе на следующий уровень лояльности
                    </p>
                  )}
                </div>

                {/* Prize Sectors List (without percentages) */}
                <div className="pt-3 border-t border-white/10">
                  <div className="text-[11px] font-medium text-zinc-400 mb-2">
                    Возможные призы на колесе
                  </div>
                  <div className="grid grid-cols-5 gap-1.5 tabular-nums">
                    {WHEEL_SECTORS.map((s) => (
                      <div
                        key={s.id}
                        className="py-2 px-1 rounded-xl bg-black/40 border border-white/5 text-center"
                      >
                        <div className="text-xs font-bold text-white">+{s.bonusAmount}</div>
                        <div className="text-[9px] text-zinc-400 mt-0.5">бон.</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Spin History */}
                {spinHistory.length > 0 && (
                  <div className="pt-3 border-t border-white/10 space-y-2">
                    <div className="text-[11px] font-medium text-zinc-400 flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5" />
                      <span>История ваших прокрутов</span>
                    </div>
                    <div className="space-y-1.5 max-h-28 overflow-y-auto">
                      {spinHistory.slice(0, 6).map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg bg-black/30 tabular-nums"
                        >
                          <span className="text-emerald-300 font-semibold">+{item.bonuses} бонусов</span>
                          <span className="text-[11px] text-zinc-500">
                            {new Date(item.created_at).toLocaleString('ru-RU', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Tiers Reference List */}
              <div className="p-4 rounded-2xl bg-[#131122] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white">Все уровни лояльности</h4>
                  <span className="text-[11px] text-zinc-400">1 BYN = {BONUS_PER_BYN_EARNED} бон.</span>
                </div>

                <div className="divide-y divide-white/10">
                  {LOYALTY_TIERS.map((t) => {
                    const isCurrent = t.id === currentTier.id;
                    return (
                      <div key={t.id} className="py-2.5 first:pt-0 last:pb-0 flex items-start justify-between gap-2">
                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span>{t.badgeEmoji}</span>
                            <span>{t.title}</span>
                            <span className="text-[11px] font-normal text-zinc-400 tabular-nums">
                              · {t.maxSpendByn ? `${t.minSpendByn}–${t.maxSpendByn}` : `${t.minSpendByn}+`} BYN
                            </span>
                          </div>
                          <div className="text-[11px] text-zinc-300 mt-0.5">
                            {t.wheelSpins} {t.wheelSpins === 1 ? 'колесо' : 'колеса'} + {t.welcomeBonuses} бон. ·
                            списание до {t.maxDiscountPercent}%
                            {t.freeCityDelivery ? ' · бесплатная доставка по городу' : ''}
                          </div>
                        </div>

                        {isCurrent && (
                          <span className="text-[10px] font-bold text-emerald-300 shrink-0 mt-0.5">
                            Текущий
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            /* ================= INTUITIVE ADMIN MANAGEMENT TAB ================= */
            <div className="space-y-4">
              {/* SECTION 1: BONUSES */}
              <div className="p-4 rounded-2xl bg-[#131122] border border-white/10 space-y-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Coins className="w-4 h-4 text-amber-400" />
                      <h3 className="text-sm font-bold text-white">1. Бонусы клиента</h3>
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5 tabular-nums">
                      Сейчас: <strong className="text-amber-300">{userBonuses} бонусов</strong> (= {Math.floor(userBonuses / 100)} BYN скидки)
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setHelpTopic('bonuses')}
                    className="min-h-[36px] px-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 text-xs font-medium flex items-center gap-1 shrink-0"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                    <span>Что это?</span>
                  </button>
                </div>

                {/* Action Mode Selector */}
                <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-black/50 border border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      hapticSelection();
                      setBonusActionMode('add');
                    }}
                    className={`min-h-[38px] rounded-lg text-xs font-semibold transition-colors ${
                      bonusActionMode === 'add'
                        ? 'bg-emerald-600 text-white'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Начислить (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      hapticSelection();
                      setBonusActionMode('subtract');
                    }}
                    className={`min-h-[38px] rounded-lg text-xs font-semibold transition-colors ${
                      bonusActionMode === 'subtract'
                        ? 'bg-red-600 text-white'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Списать (−)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      hapticSelection();
                      setBonusActionMode('set');
                    }}
                    className={`min-h-[38px] rounded-lg text-xs font-semibold transition-colors ${
                      bonusActionMode === 'set'
                        ? 'bg-purple-600 text-white'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Задать (=)
                  </button>
                </div>

                {/* Quick Amount Presets + Input */}
                <div className="grid grid-cols-4 gap-1.5 tabular-nums">
                  {[100, 200, 500, 1000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        hapticSelection();
                        setBonusAmountInput(String(preset));
                      }}
                      className={`min-h-[40px] rounded-xl text-xs font-semibold border transition-colors ${
                        Number(bonusAmountInput) === preset
                          ? 'bg-amber-500/20 border-amber-400/60 text-amber-200'
                          : 'bg-black/35 border-white/10 text-zinc-300 hover:bg-white/5'
                      }`}
                    >
                      {preset}
                      <span className="block text-[9px] font-normal text-zinc-400">{preset / 100} BYN</span>
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    value={bonusAmountInput}
                    onChange={(e) => setBonusAmountInput(e.target.value)}
                    placeholder="Введите число бонусов"
                    className="flex-1 min-h-[44px] px-3 rounded-xl bg-black/50 border border-white/15 text-sm font-semibold text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 tabular-nums"
                  />
                  {bonusActionMode === 'set' && (
                    <button
                      type="button"
                      onClick={() => setBonusAmountInput('0')}
                      className="min-h-[44px] px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-zinc-300"
                    >
                      В ноль
                    </button>
                  )}
                </div>

                {/* Live Preview + Single Clear Action Button */}
                <div className="flex items-center justify-between text-xs text-zinc-400 px-1 tabular-nums">
                  <span>Результат после нажатия:</span>
                  <span className="font-semibold text-white">
                    {userBonuses} → <strong className="text-amber-300">{previewBonusesAfter} бонусов</strong>
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleApplyBonusAction}
                  className={`w-full min-h-[46px] rounded-xl text-xs font-bold text-white transition-transform active:scale-[0.98] ${
                    bonusActionMode === 'add'
                      ? 'bg-emerald-600 hover:bg-emerald-500'
                      : bonusActionMode === 'subtract'
                      ? 'bg-red-600 hover:bg-red-500'
                      : 'bg-purple-600 hover:bg-purple-500'
                  }`}
                >
                  {bonusActionMode === 'add'
                    ? `Начислить +${parsedBonusVal} бонусов`
                    : bonusActionMode === 'subtract'
                    ? `Списать −${parsedBonusVal} бонусов`
                    : `Установить ровно ${parsedBonusVal} бонусов`}
                </button>
              </div>

              {/* SECTION 2: WHEEL SPINS */}
              <div className="p-4 rounded-2xl bg-[#131122] border border-white/10 space-y-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Gift className="w-4 h-4 text-purple-400" />
                      <h3 className="text-sm font-bold text-white">2. Крутки колеса призов</h3>
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5 tabular-nums">
                      Сейчас доступно: <strong className="text-purple-300">{userSpins} шт.</strong>
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setHelpTopic('spins')}
                    className="min-h-[36px] px-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 text-xs font-medium flex items-center gap-1 shrink-0"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-purple-400" />
                    <span>Что это?</span>
                  </button>
                </div>

                {/* Big Intuitive Stepper */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    disabled={userSpins <= 0}
                    onClick={() => handleAdjustSpins(-1)}
                    className="min-h-[46px] rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 disabled:opacity-35 text-red-200 text-xs font-bold flex items-center justify-center gap-1"
                  >
                    <Minus className="w-3.5 h-3.5" />
                    <span>1 крутка</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAdjustSpins(1)}
                    className="min-h-[46px] rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center justify-center gap-1 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>1 крутка</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAdjustSpins(3)}
                    className="min-h-[46px] rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-200 text-xs font-bold flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>3 крутки</span>
                  </button>
                </div>

                {/* Custom Spins Input */}
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    value={spinCustomInput}
                    onChange={(e) => setSpinCustomInput(e.target.value)}
                    placeholder="Кол-во"
                    className="w-24 min-h-[42px] px-3 rounded-xl bg-black/50 border border-white/15 text-xs font-semibold text-white focus:outline-none focus:border-purple-400 tabular-nums"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const val = Math.floor(Number(spinCustomInput) || 0);
                      if (val > 0) handleAdjustSpins(val);
                    }}
                    className="flex-1 min-h-[42px] rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white"
                  >
                    Добавить +{Math.max(0, Math.floor(Number(spinCustomInput) || 0))}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetExactSpins(Number(spinCustomInput) || 0)}
                    className="min-h-[42px] px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-zinc-300"
                  >
                    Задать точно
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    hapticSelection();
                    setActiveMode('client');
                  }}
                  className="w-full min-h-[40px] rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/25 text-purple-200 text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <span>Перейти и покрутить колесо за этого клиента</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* SECTION 3: SPEND & LEVEL */}
              <div className="p-4 rounded-2xl bg-[#131122] border border-white/10 space-y-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Crown className="w-4 h-4 text-emerald-400" />
                      <h3 className="text-sm font-bold text-white">3. Уровень клиента (сумма покупок)</h3>
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5 tabular-nums">
                      Сейчас: <strong className="text-white">{currentTier.badgeEmoji} {currentTier.title}</strong> ·{' '}
                      <strong className="text-emerald-300">{userSpend.toFixed(0)} BYN</strong> в профиле
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setHelpTopic('spend')}
                    className="min-h-[36px] px-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 text-xs font-medium flex items-center gap-1 shrink-0"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Что это?</span>
                  </button>
                </div>

                {/* Direct Level Switcher */}
                <div className="space-y-1.5">
                  <div className="text-[11px] text-zinc-400">Быстро установить уровень клиенту:</div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {LOYALTY_TIERS.map((t) => {
                      const active = t.id === currentTier.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => handleSelectTierDirectly(t)}
                          className={`py-2 px-1 rounded-xl border text-center transition-colors ${
                            active
                              ? 'bg-emerald-600/25 border-emerald-400 text-white'
                              : 'bg-black/40 border-white/10 text-zinc-300 hover:bg-white/5'
                          }`}
                        >
                          <div className="text-sm">{t.badgeEmoji}</div>
                          <div className="text-[9px] font-bold truncate mt-0.5">{t.title}</div>
                          <div className="text-[9px] text-zinc-400 tabular-nums">{t.minSpendByn}₽</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Add / Subtract Rubles */}
                <div className="space-y-1.5 pt-1">
                  <div className="text-[11px] text-zinc-400">
                    Или добавить / вычесть сумму покупок в BYN:
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={0}
                      value={spendAddInput}
                      onChange={(e) => setSpendAddInput(e.target.value)}
                      placeholder="Сумма BYN"
                      className="flex-1 min-h-[42px] px-3 rounded-xl bg-black/50 border border-white/15 text-xs font-semibold text-white focus:outline-none focus:border-emerald-400 tabular-nums"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const v = Math.abs(Number(spendAddInput) || 0);
                        if (v > 0) handleAdjustSpend(v);
                      }}
                      className="min-h-[42px] px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold whitespace-nowrap"
                    >
                      +{Math.abs(Number(spendAddInput) || 0)} BYN
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const v = Math.abs(Number(spendAddInput) || 0);
                        if (v > 0) handleAdjustSpend(-v);
                      }}
                      className="min-h-[42px] px-3 rounded-xl bg-red-600/80 hover:bg-red-600 text-white text-xs font-bold whitespace-nowrap"
                    >
                      −{Math.abs(Number(spendAddInput) || 0)}
                    </button>
                  </div>
                </div>

                {/* Auto-reward toggle */}
                <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-black/35 border border-white/5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoGrantTierRewards}
                    onChange={(e) => setAutoGrantTierRewards(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-emerald-500 rounded shrink-0"
                  />
                  <span className="text-[11px] text-zinc-300 leading-snug">
                    Автоматически выдать подарки (бонусы и крутки) при повышении уровня
                  </span>
                </label>

                {/* Sync all users from completed orders */}
                <button
                  type="button"
                  onClick={() => {
                    const count = syncUsersSpendFromOrders();
                    showToast(`Пересчитано профилей по выполненным заказам: ${count}`);
                  }}
                  className="w-full min-h-[42px] px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-orange-400" />
                  <span>Пересчитать суммы покупок всех клиентов из заказов</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ================= MINI HELP MODAL OVERLAY ================= */}
        {activeHelp && (
          <div
            onClick={() => setHelpTopic(null)}
            className="absolute inset-0 z-30 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[380px] rounded-2xl bg-[#18152b] border border-purple-500/40 shadow-2xl overflow-hidden"
            >
              <div className="px-4 py-3.5 border-b border-white/10 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <HelpCircle className="w-4 h-4 text-purple-400 shrink-0" />
                  <h3 className="text-sm font-bold text-white truncate">{activeHelp.title}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setHelpTopic(null)}
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/15 flex items-center justify-center text-zinc-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 space-y-3.5 max-h-[65vh] overflow-y-auto">
                <p className="text-xs text-zinc-300 leading-relaxed">{activeHelp.subtitle}</p>

                <div className="space-y-2.5">
                  {activeHelp.bullets.map((b, i) => (
                    <div key={i} className="p-2.5 rounded-xl bg-black/35 border border-white/5 space-y-0.5">
                      <div className="text-xs font-bold text-white">{b.heading}</div>
                      <div className="text-[11px] text-zinc-300 leading-relaxed">{b.text}</div>
                    </div>
                  ))}
                </div>

                <div className="p-3 rounded-xl bg-purple-500/15 border border-purple-500/30 text-[11px] text-purple-100 leading-relaxed">
                  <strong className="block text-purple-300 mb-0.5">Как пользоваться:</strong>
                  {activeHelp.example}
                </div>
              </div>

              <div className="p-3 border-t border-white/10 bg-black/20">
                <button
                  type="button"
                  onClick={() => setHelpTopic(null)}
                  className="w-full min-h-[42px] rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold"
                >
                  Понятно
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
