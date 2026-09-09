import React from 'react';
import { Mail, Phone, MapPin, ExternalLink } from 'lucide-react';
import { ContactInfo } from '../types';

interface FooterProps {
  contacts: ContactInfo;
}

export default function Footer({ contacts }: FooterProps) {
  return (
    <footer className="bg-zinc-950 border-t border-zinc-900 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-8 border-b border-zinc-900">
          
          {/* Logo Vibe */}
          <div>
            <div className="flex items-center gap-2.5">
              <div className="relative w-8 h-8 rounded-lg bg-zinc-900 border border-cyan-500/30 flex items-center justify-center font-black text-white text-base tracking-tighter">
                <span className="text-cyan-400">Л</span>К
              </div>
              <span className="text-sm font-black text-white tracking-wider uppercase">
                ЛАЗЕРТАГ КВЕСТ
              </span>
            </div>
            <p className="mt-3 text-xs text-zinc-500 leading-relaxed max-w-xs">
              Лучшие лесные и тактические лазертаг-дни рождения и командные квесты под ключ в Сочи и Адлере. Полная безопасность, новые сценарии и море драйва!
            </p>
          </div>

          {/* Quick Contacts */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest">Контакты</h4>
            <div className="space-y-2 text-xs text-zinc-500">
              <a href={`tel:${contacts.phone}`} className="flex items-center gap-2 hover:text-cyan-400 transition-colors">
                <Phone className="w-3.5 h-3.5 text-zinc-500" />
                <span>{contacts.phone}</span>
              </a>
              <a href={`mailto:${contacts.email}`} className="flex items-center gap-2 hover:text-cyan-400 transition-colors">
                <Mail className="w-3.5 h-3.5 text-zinc-500" />
                <span>{contacts.email}</span>
              </a>
              <div className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-0.5" />
                <span className="leading-snug">{contacts.address}</span>
              </div>
            </div>
          </div>

          {/* Social and Maps */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest">Мы на картах</h4>
            <div className="space-y-2">
              <a 
                href="https://yandex.ru/maps/org/lazertag_kvest/156008228304/reviews"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-cyan-400 transition-all"
              >
                Яндекс Карты (Филиал 1) <ExternalLink className="w-3 h-3" />
              </a>
              <br />
              <a 
                href="https://yandex.com/maps/org/lazertag_kvest/28570908147/reviews"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-cyan-400 transition-all"
              >
                Яндекс Карты (Филиал 2) <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

        </div>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between text-[10px] text-zinc-600 font-bold uppercase tracking-widest gap-4">
          <span>© {new Date().getFullYear()} ЛАЗЕРТАГ КВЕСТ. ВСЕ ПРАВА ЗАЩИЩЕНЫ.</span>
          <span className="text-[9px] bg-zinc-900 border border-zinc-850 px-2.5 py-1 rounded text-zinc-500 hover:text-cyan-400 cursor-pointer">
            Сочи, Россия 🇷🇺
          </span>
        </div>
      </div>
    </footer>
  );
}
