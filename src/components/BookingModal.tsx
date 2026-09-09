import React, { useState } from 'react';
import { X, Calendar, Users, Phone, User, Check, Sparkles, MessageSquare } from 'lucide-react';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  packageName?: string;
  packagePrice?: number;
}

export default function BookingModal({ isOpen, onClose, packageName, packagePrice }: BookingModalProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [date, setDate] = useState('');
  const [guests, setGuests] = useState('10');
  const [comment, setComment] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulate API request to backend
    setTimeout(() => {
      setLoading(false);
      setIsSubmitted(true);
    }, 1200);
  };

  const handleReset = () => {
    setName('');
    setPhone('');
    setDate('');
    setGuests('10');
    setComment('');
    setIsSubmitted(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
        {/* Dynamic neon header border */}
        <div className="h-1.5 w-full bg-gradient-to-r from-cyan-500 via-purple-500 to-emerald-500" />

        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {!isSubmitted ? (
          <form onSubmit={handleSubmit} className="p-6 sm:p-8">
            <div className="mb-6">
              <span className="text-xs font-black uppercase tracking-wider text-cyan-400 px-2 py-1 bg-cyan-950/50 border border-cyan-800/30 rounded">
                Бронирование
              </span>
              <h3 className="text-2xl font-black text-white mt-3">
                {packageName ? `Заказать программу «${packageName}»` : 'Забронировать космическую игру'}
              </h3>
              <p className="text-sm text-zinc-400 mt-1">
                Оставьте ваши контакты, и наш координатор праздников свяжется с вами в течение 10 минут!
              </p>

              {packagePrice && (
                <div className="mt-4 p-3 bg-zinc-900 border border-zinc-800 rounded-lg flex justify-between items-center">
                  <span className="text-sm text-zinc-400">Стоимость программы:</span>
                  <span className="text-lg font-black text-emerald-400">{packagePrice.toLocaleString()} ₽</span>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Ваше Имя</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Александр"
                    className="w-full bg-zinc-900 text-white text-sm border border-zinc-800 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Номер Телефона</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
                    <Phone className="w-4 h-4" />
                  </span>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+7 (999) 123-45-67"
                    className="w-full bg-zinc-900 text-white text-sm border border-zinc-800 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Date */}
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Желаемая Дата</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
                      <Calendar className="w-4 h-4" />
                    </span>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full bg-zinc-900 text-white text-sm border border-zinc-800 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                  </div>
                </div>

                {/* Guests */}
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Кол-во гостей</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
                      <Users className="w-4 h-4" />
                    </span>
                    <input
                      type="number"
                      value={guests}
                      min="1"
                      onChange={(e) => setGuests(e.target.value)}
                      className="w-full bg-zinc-900 text-white text-sm border border-zinc-800 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                  </div>
                </div>
              </div>

              {/* Comments */}
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Комментарий или пожелания</label>
                <div className="relative">
                  <span className="absolute top-3 left-3 text-zinc-500">
                    <MessageSquare className="w-4 h-4" />
                  </span>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Укажите возраст детей, сюжет квеста или другие пожелания..."
                    rows={2}
                    className="w-full bg-zinc-900 text-white text-sm border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-cyan-500 resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="mt-8 flex gap-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900 font-bold py-3 px-4 rounded-xl transition-all"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-cyan-500 to-emerald-500 text-black font-extrabold py-3 px-4 rounded-xl transition-all hover:brightness-110 shadow-lg shadow-cyan-950/50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Забронировать
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="p-8 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-400 text-emerald-400 rounded-full flex items-center justify-center mb-6">
              <Check className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black text-white">Заявка принята!</h3>
            <p className="text-zinc-400 text-sm mt-2 max-w-sm">
              Благодарим за обращение. Координатор праздников свяжется с вами по номеру <span className="text-cyan-400 font-bold">{phone}</span> в течение ближайших 10 минут для подтверждения бронирования.
            </p>
            <button
              onClick={handleReset}
              className="mt-8 bg-zinc-900 border border-zinc-800 text-white hover:bg-zinc-800 font-bold py-2.5 px-6 rounded-xl transition-colors"
            >
              Закрыть
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
