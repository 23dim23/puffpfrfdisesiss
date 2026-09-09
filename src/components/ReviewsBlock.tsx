import React, { useState } from 'react';
import { Star, MapPin, Globe, Plus, MessageSquare, ExternalLink, ShieldCheck } from 'lucide-react';
import { Review } from '../types';

interface ReviewsBlockProps {
  reviews: Review[];
  onAddReview: (review: Review) => void;
}

export default function ReviewsBlock({ reviews, onAddReview }: ReviewsBlockProps) {
  const [filter, setFilter] = useState<'all' | 'yandex' | 'vk' | 'manual'>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [author, setAuthor] = useState('');
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [source, setSource] = useState<'yandex' | 'vk' | 'manual'>('manual');

  const filteredReviews = reviews.filter(r => filter === 'all' || r.source === filter);

  const averageRating = (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!author.trim() || !text.trim()) return;

    const newReview: Review = {
      id: `rev-custom-${Date.now()}`,
      author,
      date: new Date().toLocaleDateString('ru-RU'),
      rating,
      text,
      source,
      avatarUrl: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100` // generic default
    };

    onAddReview(newReview);
    
    // Reset Form
    setAuthor('');
    setRating(5);
    setText('');
    setSource('manual');
    setShowAddForm(false);
  };

  return (
    <div className="py-16 bg-zinc-950 border-t border-zinc-900" id="reviews-section">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8 mb-12">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-cyan-950/40 text-cyan-400 border border-cyan-800/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-3">
              <ShieldCheck className="w-3.5 h-3.5" />
              Проверенные отзывы клиентов
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              ОТЗЫВЫ О НАШЕМ <span className="text-emerald-400">КВЕСТ-КЛУБЕ</span>
            </h2>
            <p className="mt-3 text-lg text-zinc-400 max-w-2xl">
              Нас ценят за потрясающую атмосферу, профессиональную команду аниматоров и высочайший уровень организации детских дней рождения.
            </p>
          </div>

          {/* Rating Summary Card (anti-slop design: clean, high contrast, elegant flat border) */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 p-6 rounded-2xl flex flex-col sm:flex-row items-center gap-6 self-start lg:self-center">
            <div className="text-center sm:text-left sm:border-r sm:border-zinc-800 sm:pr-6">
              <div className="text-5xl font-black text-white">{averageRating}</div>
              <div className="flex items-center justify-center sm:justify-start gap-1 mt-1 text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-current" />
                ))}
              </div>
              <div className="text-xs text-zinc-500 mt-1">Средняя оценка по отзывам</div>
            </div>

            <div className="flex flex-col gap-2">
              <a 
                href="https://yandex.ru/maps/org/lazertag_kvest/156008228304/reviews"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs font-bold text-zinc-300 hover:text-cyan-400 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 hover:border-cyan-500/40 px-4 py-2 rounded-xl transition-all"
              >
                <Globe className="w-4 h-4 text-rose-500" />
                Яндекс Карты (Филиал 1) <ExternalLink className="w-3 h-3" />
              </a>
              <a 
                href="https://yandex.com/maps/org/lazertag_kvest/28570908147/reviews"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs font-bold text-zinc-300 hover:text-cyan-400 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 hover:border-cyan-500/40 px-4 py-2 rounded-xl transition-all"
              >
                <MapPin className="w-4 h-4 text-emerald-400" />
                Яндекс Карты (Филиал 2) <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        {/* Filter Toolbar & Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-full text-xs font-bold border transition-all ${
                filter === 'all'
                  ? 'bg-cyan-500 border-cyan-500 text-black'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
              }`}
            >
              Все отзывы ({reviews.length})
            </button>
            <button
              onClick={() => setFilter('yandex')}
              className={`px-4 py-2 rounded-full text-xs font-bold border transition-all ${
                filter === 'yandex'
                  ? 'bg-red-500 border-red-500 text-white'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
              }`}
            >
              Яндекс Карты
            </button>
            <button
              onClick={() => setFilter('vk')}
              className={`px-4 py-2 rounded-full text-xs font-bold border transition-all ${
                filter === 'vk'
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
              }`}
            >
              ВКонтакте
            </button>
            <button
              onClick={() => setFilter('manual')}
              className={`px-4 py-2 rounded-full text-xs font-bold border transition-all ${
                filter === 'manual'
                  ? 'bg-emerald-500 border-emerald-500 text-black'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
              }`}
            >
              Оставленные на сайте
            </button>
          </div>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 bg-gradient-to-r from-cyan-500 to-emerald-500 text-black text-xs font-black px-4 py-2 rounded-full hover:brightness-110 shadow-md transition-all self-stretch sm:self-auto justify-center"
          >
            <Plus className="w-4 h-4" />
            Оставить свой отзыв
          </button>
        </div>

        {/* Inline Add Review Form */}
        {showAddForm && (
          <form 
            onSubmit={handleSubmit} 
            className="mb-10 bg-zinc-900/80 border border-zinc-800 p-6 rounded-2xl max-w-xl animate-fadeIn"
          >
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-cyan-400" />
              Ваш отзыв о клубе «Лазертаг Квест»
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Как вас зовут</label>
                <input
                  type="text"
                  required
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Мария Иванова"
                  className="w-full bg-zinc-950 text-white text-xs border border-zinc-800 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Оценка</label>
                  <select
                    value={rating}
                    onChange={(e) => setRating(Number(e.target.value))}
                    className="w-full bg-zinc-950 text-white text-xs border border-zinc-800 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  >
                    <option value={5}>⭐⭐⭐⭐⭐ (Отлично)</option>
                    <option value={4}>⭐⭐⭐⭐ (Хорошо)</option>
                    <option value={3}>⭐⭐⭐ (Удовлетворительно)</option>
                    <option value={2}>⭐⭐ (Плохо)</option>
                    <option value={1}>⭐ (Ужасно)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Источник</label>
                  <select
                    value={source}
                    onChange={(e) => setSource(e.target.value as any)}
                    className="w-full bg-zinc-950 text-white text-xs border border-zinc-800 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  >
                    <option value="manual">Сайт клуба</option>
                    <option value="yandex">Яндекс Карты</option>
                    <option value="vk">ВКонтакте</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Текст отзыва</label>
                <textarea
                  required
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Поделитесь вашими впечатлениями от игры, работы инструктора или организации праздника..."
                  rows={4}
                  className="w-full bg-zinc-950 text-white text-xs border border-zinc-800 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-cyan-500 resize-none"
                />
              </div>
            </div>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-white px-4 py-2 rounded-lg text-xs font-bold transition-all"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="bg-gradient-to-r from-cyan-500 to-emerald-500 text-black px-5 py-2 rounded-lg text-xs font-black transition-all hover:brightness-110"
              >
                Опубликовать отзыв
              </button>
            </div>
          </form>
        )}

        {/* Reviews Grid */}
        {filteredReviews.length === 0 ? (
          <div className="text-center py-12 bg-zinc-900/30 rounded-2xl border border-zinc-800 border-dashed">
            <p className="text-zinc-500 text-sm">В этой категории отзывов пока нет.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredReviews.map((review) => (
              <div 
                key={review.id} 
                className="bg-zinc-900/40 border border-zinc-800/80 p-6 rounded-2xl flex flex-col justify-between hover:border-zinc-700 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <img 
                        src={review.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100'} 
                        alt={review.author}
                        className="w-10 h-10 rounded-full object-cover border border-zinc-800"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <h4 className="text-sm font-bold text-white">{review.author}</h4>
                        <span className="text-[10px] text-zinc-500">{review.date}</span>
                      </div>
                    </div>

                    {/* Source badge */}
                    <div className="flex flex-col items-end">
                      <div className="flex gap-0.5 text-amber-400 mb-1">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            className={`w-3.5 h-3.5 ${
                              i < review.rating ? 'fill-current' : 'text-zinc-700'
                            }`} 
                          />
                        ))}
                      </div>
                      <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${
                        review.source === 'yandex'
                          ? 'bg-red-950/40 text-red-400 border-red-800/40'
                          : review.source === 'vk'
                          ? 'bg-blue-950/40 text-blue-400 border-blue-800/40'
                          : 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40'
                      }`}>
                        {review.source === 'yandex' ? 'Яндекс.Карты' : review.source === 'vk' ? 'ВКонтакте' : 'Сайт клуба'}
                      </span>
                    </div>
                  </div>

                  <p className="text-zinc-300 text-sm leading-relaxed italic">
                    «{review.text}»
                  </p>
                </div>

                {review.sourceUrl && (
                  <div className="mt-4 pt-4 border-t border-zinc-900 flex justify-end">
                    <a 
                      href={review.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-zinc-500 hover:text-cyan-400 transition-colors"
                    >
                      Смотреть оригинал на картах <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
