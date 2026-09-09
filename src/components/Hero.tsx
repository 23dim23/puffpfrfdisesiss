import React from 'react';
import { Play, Sparkles, ChevronDown, Gamepad2, Gift, Users } from 'lucide-react';

interface HeroProps {
  onExplore: () => void;
  onOpenBooking: () => void;
  onOpenAtmosphere: () => void;
  heroTitle: string;
  heroSubtitle: string;
}

export default function Hero({ 
  onExplore, 
  onOpenBooking, 
  onOpenAtmosphere,
  heroTitle,
  heroSubtitle 
}: HeroProps) {
  return (
    <div className="relative min-h-[85vh] flex items-center justify-center bg-zinc-950 overflow-hidden py-16 sm:py-24">
      
      {/* Neo-Grid Background Overlay resembling real lasertag.msk.ru styling */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#09090b_1px,transparent_1px),linear-gradient(to_bottom,#09090b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-25" />

      {/* Pulsing visual neon laser rays (Simulated lasers!) */}
      <div className="absolute top-[20%] left-[-10%] w-[45%] h-[2px] bg-cyan-500/30 blur-[3px] rotate-12 transform animate-pulse" />
      <div className="absolute bottom-[25%] right-[-15%] w-[50%] h-[2px] bg-emerald-500/30 blur-[3px] -rotate-12 transform animate-pulse" />
      <div className="absolute top-[50%] left-[30%] w-[30%] h-[1px] bg-purple-500/40 blur-[2px] -rotate-45 transform" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10 flex flex-col items-center">
        
        {/* Animated dynamic badge */}
        <div className="inline-flex items-center gap-1.5 bg-zinc-900 border border-cyan-500/25 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest text-cyan-400 mb-8 animate-bounce shadow-lg shadow-cyan-950/20">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          СКИДКА -15% НА ДЕНЬ РОЖДЕНИЯ В БУДНИ!
        </div>

        {/* Hero title with laser-cyber feel */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight leading-tight max-w-5xl">
          {heroTitle.split(' ').map((word, i) => (
            <span key={i} className={/лазертаг|космический/i.test(word) ? "text-cyan-400 block sm:inline" : ""}>
              {word}{' '}
            </span>
          ))}
        </h1>

        {/* Description Subtitle */}
        <p className="mt-6 text-base sm:text-lg lg:text-xl text-zinc-400 max-w-3xl leading-relaxed">
          {heroSubtitle}
        </p>

        {/* Action Button cluster */}
        <div className="mt-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-4 w-full max-w-md sm:max-w-none">
          <button
            onClick={onOpenBooking}
            className="bg-gradient-to-r from-cyan-500 to-emerald-500 hover:brightness-110 text-black text-sm font-black uppercase tracking-wider px-8 py-4 rounded-xl transition-all shadow-lg shadow-cyan-950/50 flex items-center justify-center gap-2"
          >
            <Gamepad2 className="w-5 h-5" />
            Рассчитать праздник
          </button>

          <button
            onClick={onOpenAtmosphere}
            className="bg-zinc-900 hover:bg-zinc-850 text-white border border-zinc-800 hover:border-cyan-500/40 text-sm font-black uppercase tracking-wider px-8 py-4 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <div className="w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-400 flex items-center justify-center">
              <Play className="w-3.5 h-3.5 text-cyan-400 fill-current ml-0.5" />
            </div>
            Смотреть клипы (Reels)
          </button>
        </div>

        {/* Emotional Vibe Cards (Quick overview of features) */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl w-full">
          <div className="bg-zinc-900/40 border border-zinc-850 p-6 rounded-2xl flex flex-col items-center text-center">
            <div className="w-10 h-10 bg-cyan-950/50 border border-cyan-800/30 text-cyan-400 rounded-xl flex items-center justify-center mb-4">
              <Gift className="w-5 h-5" />
            </div>
            <h3 className="text-white text-sm font-extrabold uppercase tracking-wider">Праздник «Под Ключ»</h3>
            <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
              Квесты, банкетные зоны, шоу-программы и подарки. Всё организовано за вас.
            </p>
          </div>

          <div className="bg-zinc-900/40 border border-zinc-850 p-6 rounded-2xl flex flex-col items-center text-center">
            <div className="w-10 h-10 bg-emerald-950/50 border border-emerald-800/30 text-emerald-400 rounded-xl flex items-center justify-center mb-4">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-white text-sm font-extrabold uppercase tracking-wider">Игры от 6 до 60 лет</h3>
            <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
              Индивидуальные сценарии по возрасту: от простых миссий до сложных спортивных тактик.
            </p>
          </div>

          <div className="bg-zinc-900/40 border border-zinc-850 p-6 rounded-2xl flex flex-col items-center text-center">
            <div className="w-10 h-10 bg-purple-950/50 border border-purple-800/30 text-purple-400 rounded-xl flex items-center justify-center mb-4">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <h3 className="text-white text-sm font-extrabold uppercase tracking-wider">Новое снаряжение</h3>
            <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
              Легкие беспроводные бластеры, сенсорные жилеты и цифровые контрольные базы.
            </p>
          </div>
        </div>

        {/* Bottom indicator */}
        <div 
          onClick={onExplore}
          className="mt-16 text-zinc-600 hover:text-cyan-400 cursor-pointer transition-colors flex flex-col items-center gap-1 text-xs font-bold uppercase tracking-widest animate-pulse"
        >
          <span>Листать подробнее</span>
          <ChevronDown className="w-4 h-4" />
        </div>

      </div>
    </div>
  );
}
