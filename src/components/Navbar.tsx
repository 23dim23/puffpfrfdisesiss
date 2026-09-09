import React, { useState } from 'react';
import { Menu, X, ShieldAlert, Sparkles, Calendar, Settings } from 'lucide-react';
import { Section } from '../types';

interface NavbarProps {
  sections: Section[];
  activeSectionId: string;
  onSectionChange: (id: string) => void;
  onOpenAdmin: () => void;
  onOpenBooking: () => void;
}

export default function Navbar({ 
  sections, 
  activeSectionId, 
  onSectionChange, 
  onOpenAdmin, 
  onOpenBooking 
}: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);

  const activeSections = sections.filter(sec => sec.isActive);

  const handleNavClick = (id: string) => {
    onSectionChange(id);
    setIsOpen(false);
  };

  return (
    <nav className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Logo Vibe (Anti-slop: clean, stylish typography and a laser-like slash instead of huge graphics) */}
          <div 
            className="flex items-center gap-2.5 cursor-pointer group"
            onClick={() => handleNavClick('home')}
          >
            <div className="relative w-9 h-9 rounded-lg bg-zinc-900 border border-cyan-500/30 flex items-center justify-center font-black text-white text-lg tracking-tighter group-hover:border-cyan-400 transition-colors">
              <span className="text-cyan-400">Л</span>К
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            
            <div>
              <span className="block text-sm font-black text-white tracking-wider group-hover:text-cyan-400 transition-colors uppercase">
                ЛАЗЕРТАГ КВЕСТ
              </span>
              <span className="block text-[9px] font-black text-zinc-500 tracking-widest uppercase">
                КОСМИЧЕСКАЯ АРЕНА
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center gap-1">
            {activeSections.map((sec) => (
              <button
                key={sec.id}
                onClick={() => handleNavClick(sec.id)}
                className={`px-3.5 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                  activeSectionId === sec.id
                    ? 'text-cyan-400 bg-cyan-950/20 border border-cyan-500/20'
                    : 'text-zinc-400 hover:text-white border border-transparent'
                }`}
              >
                {sec.title}
              </button>
            ))}
          </div>

          {/* Action Button cluster */}
          <div className="hidden sm:flex items-center gap-3">
            {/* Admin entry point */}
            <button
              onClick={onOpenAdmin}
              className="px-3 py-2 rounded-xl text-zinc-500 hover:text-cyan-400 hover:bg-zinc-900/60 transition-colors text-xs font-bold flex items-center gap-1.5 border border-transparent hover:border-zinc-800/85"
              title="Панель администратора"
            >
              <Settings className="w-4 h-4" />
              <span>Админка</span>
            </button>

            {/* Main Booking Button */}
            <button
              onClick={onOpenBooking}
              className="bg-gradient-to-r from-cyan-500 to-emerald-500 hover:brightness-110 text-black text-xs font-black uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all shadow-md shadow-cyan-950/30 flex items-center gap-1.5"
            >
              <Calendar className="w-4 h-4" />
              Забронировать
            </button>
          </div>

          {/* Mobile menu and admin triggers */}
          <div className="flex items-center gap-2 lg:hidden">
            <button
              onClick={onOpenAdmin}
              className="p-2 text-zinc-500 hover:text-cyan-400 hover:bg-zinc-900 rounded-lg"
              title="Админка"
            >
              <Settings className="w-5 h-5" />
            </button>

            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 focus:outline-none"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Menu Panel */}
      {isOpen && (
        <div className="lg:hidden border-t border-zinc-900 bg-zinc-950 px-4 py-4 space-y-2">
          {activeSections.map((sec) => (
            <button
              key={sec.id}
              onClick={() => handleNavClick(sec.id)}
              className={`w-full text-left px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                activeSectionId === sec.id
                  ? 'text-cyan-400 bg-cyan-950/20 border border-cyan-500/20'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              {sec.title}
            </button>
          ))}

          <div className="pt-4 border-t border-zinc-900 flex flex-col gap-2">
            <button
              onClick={() => { setIsOpen(false); onOpenBooking(); }}
              className="w-full bg-gradient-to-r from-cyan-500 to-emerald-500 text-black text-center py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5"
            >
              <Calendar className="w-4 h-4" />
              Забронировать игру
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
