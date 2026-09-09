import React from 'react';
import { Section, Package, ContactInfo } from '../types';
import { 
  Clock, Users, Check, Flame, Calendar, Phone, Mail, MapPin, 
  Sparkles, ExternalLink, ShieldCheck, HeartHandshake, Award
} from 'lucide-react';

interface SectionViewerProps {
  section: Section;
  contacts: ContactInfo;
  onBookPackage: (packageName: string, price: number) => void;
  onOpenBooking: () => void;
}

export default function SectionViewer({ 
  section, 
  contacts, 
  onBookPackage, 
  onOpenBooking 
}: SectionViewerProps) {
  
  if (section.id === 'contacts') {
    return (
      <div className="py-16 bg-zinc-950 border-t border-zinc-900" id="contacts-page">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            
            {/* Left Column: Info & Details */}
            <div className="space-y-8">
              <div>
                <span className="text-xs font-black uppercase tracking-widest text-cyan-400 bg-cyan-950/40 border border-cyan-800/30 px-3 py-1 rounded-full">
                  Контакты клуба
                </span>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-4 tracking-tight">
                  ЖДЕМ ВАС НА <span className="text-cyan-400">КОСМИЧЕСКОЙ АРЕНЕ</span>
                </h2>
                <p className="mt-3 text-zinc-400 text-sm leading-relaxed">
                  Мы работаем без выходных, чтобы дарить вам яркие эмоции! Вы можете приехать к нам лично для просмотра арены, заказать выездное мероприятие на свою площадку или забронировать время праздника по телефону.
                </p>
              </div>

              {/* Contacts cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-zinc-900/40 border border-zinc-850 p-5 rounded-2xl">
                  <div className="w-9 h-9 rounded-lg bg-cyan-950/50 border border-cyan-800/30 text-cyan-400 flex items-center justify-center mb-3">
                    <Phone className="w-5 h-5" />
                  </div>
                  <span className="block text-[10px] font-black text-zinc-500 uppercase tracking-wider">Телефон для брони</span>
                  <a href={`tel:${contacts.phone}`} className="block text-white font-extrabold text-base mt-1 hover:text-cyan-400 transition-colors">
                    {contacts.phone}
                  </a>
                </div>

                <div className="bg-zinc-900/40 border border-zinc-850 p-5 rounded-2xl">
                  <div className="w-9 h-9 rounded-lg bg-emerald-950/50 border border-emerald-800/30 text-emerald-400 flex items-center justify-center mb-3">
                    <Clock className="w-5 h-5" />
                  </div>
                  <span className="block text-[10px] font-black text-zinc-500 uppercase tracking-wider">Часы работы</span>
                  <span className="block text-white font-extrabold text-sm mt-1">
                    {contacts.workingHours}
                  </span>
                </div>

                <div className="bg-zinc-900/40 border border-zinc-850 p-5 rounded-2xl sm:col-span-2">
                  <div className="w-9 h-9 rounded-lg bg-purple-950/50 border border-purple-800/30 text-purple-400 flex items-center justify-center mb-3">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <span className="block text-[10px] font-black text-zinc-500 uppercase tracking-wider">Адрес лазертаг-арены</span>
                  <span className="block text-white font-extrabold text-sm mt-1 leading-relaxed">
                    {contacts.address}
                  </span>
                </div>
              </div>

              <div className="pt-4 flex gap-4">
                <button
                  onClick={onOpenBooking}
                  className="bg-gradient-to-r from-cyan-500 to-emerald-500 hover:brightness-110 text-black text-xs font-black uppercase tracking-wider px-6 py-3 rounded-xl transition-all shadow-md flex items-center gap-2"
                >
                  <Calendar className="w-4 h-4" />
                  Заказать обратный звонок
                </button>
              </div>
            </div>

            {/* Right Column: Yandex Interactive Map Widget */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden h-[400px] sm:h-[450px] relative shadow-lg">
              {/* Fallback absolute banner/styling if frame cannot load */}
              <iframe
                src={contacts.yandexMapWidgetUrl}
                width="100%"
                height="100%"
                frameBorder="0"
                allowFullScreen={true}
                className="w-full h-full grayscale opacity-80 hover:grayscale-0 transition-all duration-300"
                title="Yandex Maps Location"
              />
              {/* Floating Map info tag */}
              <div className="absolute top-4 left-4 bg-zinc-950/90 border border-zinc-850 px-3 py-1.5 rounded-full text-[10px] font-bold text-white flex items-center gap-1.5 shadow">
                <MapPin className="w-3.5 h-3.5 text-rose-500 fill-current" />
                <span>ТРЦ «Галактика», 3-й этаж</span>
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-16 bg-zinc-950 border-t border-zinc-900" id={`section-${section.id}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-flex items-center gap-1 bg-cyan-950/40 text-cyan-400 border border-cyan-800/30 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            Разделы сайта / {section.title}
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-snug">
            {section.heroTitle}
          </h2>
          <p className="mt-4 text-zinc-400 text-sm sm:text-base leading-relaxed">
            {section.heroSubtitle}
          </p>
        </div>

        {/* Section Detailed Description & Core details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16 pb-12 border-b border-zinc-900">
          <div className="space-y-6">
            <h3 className="text-2xl font-black text-white tracking-tight leading-tight">
              Как мы создаем <span className="text-cyan-400">лучшие приключения</span>
            </h3>
            <p className="text-zinc-300 text-sm leading-relaxed">
              {section.description}
            </p>
            <p className="text-zinc-400 text-sm leading-relaxed italic">
              {section.contentMarkdown}
            </p>

            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-cyan-950/80 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mt-0.5 shrink-0">
                  <ShieldCheck className="w-3 h-3" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">100% Безопасность</h4>
                  <p className="text-[10px] text-zinc-500 mt-0.5">Мягкие лабиринты и безболезненные лучи</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-emerald-950/80 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mt-0.5 shrink-0">
                  <HeartHandshake className="w-3 h-3" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Супер ведущие</h4>
                  <p className="text-[10px] text-zinc-500 mt-0.5">Опытные инструкторы и актеры</p>
                </div>
              </div>
            </div>
          </div>

          {/* Graphic Vibe banner */}
          <div className="relative h-[280px] sm:h-[350px] rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800">
            <img 
              src={
                section.id === 'birthdays' 
                  ? 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&q=80&w=600'
                  : section.id === 'corporates'
                  ? 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80&w=600'
                  : 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=600'
              } 
              alt={section.title}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
            
            {/* Visual float badge */}
            <div className="absolute bottom-6 left-6 bg-zinc-950/90 border border-zinc-850 px-4 py-2.5 rounded-xl">
              <span className="block text-[10px] font-black text-cyan-400 uppercase tracking-widest">Локация</span>
              <span className="block text-white text-xs font-black uppercase tracking-wider mt-0.5">Тематический Лабиринт 未来</span>
            </div>
          </div>
        </div>

        {/* Packages Grid (Tariffs) */}
        {section.packages && section.packages.length > 0 && (
          <div>
            <h3 className="text-2xl font-black text-center text-white tracking-tight mb-10">
              СТОИМОСТЬ ПАКЕТОВ <span className="text-cyan-400">«ПОД КЛЮЧ»</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch">
              {section.packages.map((pkg) => (
                <div 
                  key={pkg.id}
                  className={`group relative rounded-2xl p-6 bg-zinc-900/40 border flex flex-col justify-between hover:shadow-xl hover:shadow-cyan-950/10 transition-all duration-300 ${
                    pkg.isPopular 
                      ? 'border-cyan-500/50 shadow-lg shadow-cyan-950/10' 
                      : 'border-zinc-850/80 hover:border-zinc-700'
                  }`}
                >
                  {/* Popular Indicator Tag */}
                  {pkg.isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-cyan-500 to-emerald-500 text-black text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-md">
                      Рекомендуем 🌟
                    </div>
                  )}

                  <div>
                    {/* Header */}
                    <div className="mb-6">
                      <h4 className="text-lg font-black text-white uppercase tracking-wide group-hover:text-cyan-400 transition-colors">
                        {pkg.name}
                      </h4>
                      
                      <div className="mt-4 flex items-center gap-3 text-xs text-zinc-500">
                        <span className="flex items-center gap-1 bg-zinc-950 px-2 py-1 rounded">
                          <Clock className="w-3.5 h-3.5 text-zinc-400" />
                          {pkg.duration}
                        </span>
                        <span className="flex items-center gap-1 bg-zinc-950 px-2 py-1 rounded">
                          <Users className="w-3.5 h-3.5 text-zinc-400" />
                          {pkg.playersCount}
                        </span>
                      </div>
                    </div>

                    {/* Features list */}
                    <ul className="space-y-2.5 mb-8">
                      {pkg.features.map((feat, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-xs text-zinc-300 leading-snug">
                          <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Pricing and Action */}
                  <div className="pt-6 border-t border-zinc-950 mt-auto">
                    <div className="flex items-baseline justify-between mb-4">
                      <span className="text-xs text-zinc-500">Итоговая стоимость:</span>
                      <div className="text-right">
                        {pkg.oldPrice && (
                          <span className="block text-xs text-zinc-500 line-through">
                            {pkg.oldPrice.toLocaleString()} ₽
                          </span>
                        )}
                        <span className="text-2xl font-black text-emerald-400">
                          {pkg.price.toLocaleString()} ₽
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => onBookPackage(pkg.name, pkg.price)}
                      className={`w-full text-center py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                        pkg.isPopular
                          ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-black shadow-lg shadow-cyan-950/20 hover:brightness-110'
                          : 'bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-750 text-white'
                      }`}
                    >
                      Забронировать пакет
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
