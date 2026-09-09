import React, { useState } from 'react';
import { Tag, Clock, CheckCircle2, ChevronRight, ShoppingBag, Flame, Sparkles } from 'lucide-react';
import { Service } from '../types';

interface ServicesCatalogueProps {
  services: Service[];
  onBookService: (serviceName: string, servicePrice?: number) => void;
}

export default function ServicesCatalogue({ services, onBookService }: ServicesCatalogueProps) {
  const [activeCategory, setActiveCategory] = useState<string>('Все');

  // Dynamically extract unique categories
  const categories = ['Все', ...Array.from(new Set(services.map(s => s.category)))];

  const filteredServices = services.filter(s => {
    if (activeCategory === 'Все') return true;
    return s.category === activeCategory;
  });

  return (
    <div className="py-16 bg-zinc-950 border-t border-zinc-900" id="services-catalogue">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-cyan-950/40 text-cyan-400 border border-cyan-800/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-3">
              <ShoppingBag className="w-3.5 h-3.5" />
              Каталог цен и развлечений
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              НАШИ УСЛУГИ И <span className="text-cyan-400">ПРАЙС-ЛИСТ</span>
            </h2>
            <p className="mt-3 text-lg text-zinc-400 max-w-2xl">
              Выбирайте готовые пакеты приключений или комбинируйте дополнительные шоу-программы для вашего идеального праздника.
            </p>
          </div>

          <div className="mt-4 md:mt-0">
            <span className="text-xs text-zinc-500 bg-zinc-900 border border-zinc-800 px-3.5 py-2 rounded-xl">
              Синхронизировано с Яндекс Картами 📍
            </span>
          </div>
        </div>

        {/* Category Filters (Refined design) */}
        <div className="flex flex-wrap gap-2 mb-10">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-4.5 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                activeCategory === category
                  ? 'bg-cyan-500 border-cyan-500 text-black shadow-lg shadow-cyan-950/20'
                  : 'bg-zinc-900/60 border-zinc-800/80 text-zinc-400 hover:text-white hover:border-zinc-700'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Services Grid (Clean, premium dark card layout) */}
        {filteredServices.length === 0 ? (
          <div className="text-center py-16 bg-zinc-900/20 rounded-2xl border border-zinc-800 border-dashed">
            <p className="text-zinc-500 text-sm">В этой категории услуг пока нет.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredServices.map((service) => (
              <div 
                key={service.id}
                className="group relative bg-zinc-900/40 border border-zinc-800/80 hover:border-cyan-500/40 rounded-2xl overflow-hidden flex flex-col justify-between hover:shadow-xl hover:shadow-cyan-950/10 transition-all duration-300"
              >
                {/* Image Section */}
                <div className="relative h-48 overflow-hidden bg-zinc-950">
                  <img 
                    src={service.image || 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80&w=600'} 
                    alt={service.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/30 to-transparent" />
                  
                  {/* Popular badge */}
                  {service.isPopular && (
                    <div className="absolute top-4 left-4 bg-gradient-to-r from-cyan-500 to-emerald-500 text-black text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 fill-current text-amber-950" />
                      Хит продаж
                    </div>
                  )}

                  {/* Category badge */}
                  <div className="absolute bottom-4 left-4 bg-zinc-950/80 border border-zinc-800 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-zinc-400">
                    {service.category}
                  </div>
                </div>

                {/* Content Section */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-extrabold text-white group-hover:text-cyan-400 transition-colors leading-snug">
                      {service.name}
                    </h3>
                    <p className="mt-2 text-xs text-zinc-400 line-clamp-3 leading-relaxed">
                      {service.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-4 border-t border-zinc-950">
                    {/* Meta info */}
                    <div className="flex items-center gap-4 text-xs text-zinc-500 mb-4">
                      {service.duration && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-zinc-400" />
                          {service.duration}
                        </span>
                      )}
                      {service.availability && (
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          {service.availability}
                        </span>
                      )}
                    </div>

                    {/* Price and Action */}
                    <div className="flex items-center justify-between">
                      <div>
                        {service.oldPrice && (
                          <span className="block text-xs text-zinc-500 line-through">
                            {service.oldPrice.toLocaleString()} ₽
                          </span>
                        )}
                        <span className="text-xl font-black text-emerald-400">
                          {service.price.toLocaleString()} ₽
                        </span>
                      </div>

                      <button
                        onClick={() => onBookService(service.name, service.price)}
                        className="bg-zinc-950 hover:bg-cyan-500 text-cyan-400 hover:text-black border border-cyan-500/30 hover:border-cyan-500 text-xs font-black px-4 py-2 rounded-xl flex items-center gap-1 transition-all"
                      >
                        Заказать
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
