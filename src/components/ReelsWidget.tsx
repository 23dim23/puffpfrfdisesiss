import React, { useState, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Heart, Share2, Sparkles, X, ChevronRight, MessageCircle } from 'lucide-react';
import { Reel } from '../types';

interface ReelsWidgetProps {
  reels: Reel[];
}

export default function ReelsWidget({ reels }: ReelsWidgetProps) {
  const [activeReel, setActiveReel] = useState<Reel | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [likedReels, setLikedReels] = useState<{ [id: string]: boolean }>({});
  const [comments, setComments] = useState<{ [id: string]: { author: string; text: string }[] }>({
    'reel-1': [
      { author: 'Светлана К.', text: 'Праздновали у вас на прошлой неделе, сын просто в восторге! 😍' },
      { author: 'Игорь И.', text: 'Крутые сценарии! Обязательно придем еще.' }
    ],
    'reel-2': [
      { author: 'Юлия Т.', text: 'Для корпоратива действительно классная разрядка 👍' },
      { author: 'Павел С.', text: 'Битва директоров против менеджеров — это было легендарно!' }
    ],
    'reel-3': [
      { author: 'Анна Д.', text: 'Какой классный лабиринт! Спецэффекты космос ✨' }
    ]
  });
  const [newComment, setNewComment] = useState('');

  const videoRef = useRef<HTMLVideoElement | null>(null);

  const handleOpenReel = (reel: Reel) => {
    setActiveReel(reel);
    setIsPlaying(true);
    setIsMuted(false);
  };

  const handleCloseReel = () => {
    setActiveReel(null);
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(() => {});
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleLike = (reelId: string) => {
    setLikedReels(prev => ({
      ...prev,
      [reelId]: !prev[reelId]
    }));
  };

  const handleAddComment = (reelId: string) => {
    if (!newComment.trim()) return;
    setComments(prev => ({
      ...prev,
      [reelId]: [...(prev[reelId] || []), { author: 'Вы', text: newComment }]
    }));
    setNewComment('');
  };

  return (
    <div className="py-12 bg-zinc-950 border-t border-b border-zinc-900 overflow-hidden" id="atmosphere-vibe">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8">
          <div>
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-emerald-500 bg-clip-text text-transparent text-sm font-bold uppercase tracking-wider mb-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              ЖИВЫЕ ЭМОЦИИ ПРАЗДНИКА
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              АТМОСФЕРА ДРАЙВА В <span className="text-cyan-400">ФОРМАТЕ REELS</span>
            </h2>
            <p className="mt-3 text-lg text-zinc-400 max-w-2xl">
              Посмотрите, как проходят наши космические квесты и лазертаг-битвы. Настоящие эмоции, искренний смех и неподдельный азарт!
            </p>
          </div>
          
          <div className="mt-4 md:mt-0">
            <span className="text-xs text-zinc-500 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-full uppercase tracking-wider font-semibold">
              Кликните для просмотра со звуком 🔊
            </span>
          </div>
        </div>

        {/* Reels grid preview styled like modern vertical phone stories */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {reels.map((reel) => (
            <div 
              key={reel.id}
              className="group relative h-[420px] rounded-2xl overflow-hidden cursor-pointer border border-zinc-800 bg-zinc-900/40 hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-950/20 transition-all duration-300"
              onClick={() => handleOpenReel(reel)}
            >
              {/* Image Preview with Hover scale */}
              <img 
                src={reel.thumbnailUrl} 
                alt={reel.title}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                referrerPolicy="no-referrer"
              />
              {/* Semi-transparent dark overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-900/30 to-zinc-950/20 group-hover:via-zinc-900/10 transition-colors duration-300" />

              {/* Glowing Laser Lines (Visual styling resembling lazertag.msk.ru) */}
              <div className="absolute bottom-0 left-0 w-full h-1.5 bg-gradient-to-r from-cyan-500 to-emerald-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />

              {/* Tag Badge */}
              <div className="absolute top-4 left-4 bg-cyan-950/80 backdrop-blur-md text-cyan-400 border border-cyan-500/30 px-2.5 py-1 rounded-full text-xs font-bold tracking-wide">
                {reel.tag}
              </div>

              {/* Heart count and play counter */}
              <div className="absolute top-4 right-4 flex items-center gap-3 text-white text-xs font-medium bg-zinc-950/60 backdrop-blur-md px-2.5 py-1 rounded-full">
                <span className="flex items-center gap-1">
                  <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                  {reel.likes + (likedReels[reel.id] ? 1 : 0)}
                </span>
                <span className="text-zinc-400">|</span>
                <span>{reel.plays} просмотров</span>
              </div>

              {/* Dynamic Overlay Play Icon */}
              <div className="absolute inset-0 flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity">
                <div className="w-14 h-14 rounded-full bg-cyan-500/20 group-hover:bg-cyan-500/30 border border-cyan-400 flex items-center justify-center backdrop-blur-sm transition-all duration-300 transform group-hover:scale-110">
                  <Play className="w-6 h-6 text-white fill-white ml-0.5" />
                </div>
              </div>

              {/* Title & Description at bottom */}
              <div className="absolute bottom-4 left-4 right-4">
                <h3 className="text-white text-base font-bold line-clamp-2 leading-snug drop-shadow-md">
                  {reel.title}
                </h3>
                <div className="mt-2 flex items-center text-xs text-cyan-400 font-semibold group-hover:text-emerald-400 transition-colors">
                  Смотреть клип <ChevronRight className="w-3 h-3 ml-0.5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Reels Modal Player with TikTok/Instagram Vibe */}
      {activeReel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <div className="relative w-full max-w-4xl bg-zinc-950 rounded-2xl border border-zinc-800 overflow-hidden flex flex-col md:flex-row h-[85vh] max-h-[700px] shadow-2xl">
            {/* Close Button on top right of the whole modal */}
            <button 
              onClick={handleCloseReel}
              className="absolute top-4 right-4 z-55 w-10 h-10 rounded-full bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700/50 flex items-center justify-center text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Left Side: Vertical Video Player */}
            <div className="relative flex-1 bg-black flex items-center justify-center h-[50%] md:h-full group/player">
              <video
                ref={videoRef}
                src={activeReel.videoUrl}
                className="w-full h-full object-cover"
                autoPlay={isPlaying}
                loop
                muted={isMuted}
                playsInline
                referrerPolicy="no-referrer"
              />

              {/* Gradient cover inside player */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />

              {/* Controls inside video */}
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white z-10">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={togglePlay}
                    className="w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 border border-zinc-700 flex items-center justify-center"
                  >
                    {isPlaying ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white fill-white ml-0.5" />}
                  </button>
                  <button 
                    onClick={toggleMute}
                    className="w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 border border-zinc-700 flex items-center justify-center"
                  >
                    {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                  </button>
                </div>

                <div className="text-xs bg-black/60 px-2.5 py-1.5 rounded-md font-mono border border-zinc-800/40">
                  {activeReel.duration}
                </div>
              </div>

              {/* Floating watermark */}
              <div className="absolute top-4 left-4 z-10 bg-cyan-950/80 border border-cyan-500/30 px-3 py-1 rounded-full text-xs font-bold text-cyan-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                ЛАЗЕРТАГ АТМОСФЕРА
              </div>
            </div>

            {/* Right Side: Comments & Interaction (Social panel) */}
            <div className="w-full md:w-[360px] border-t md:border-t-0 md:border-l border-zinc-800 flex flex-col justify-between bg-zinc-950 h-[50%] md:h-full">
              {/* Header */}
              <div className="p-4 border-b border-zinc-900 flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-500 to-emerald-500 flex items-center justify-center font-black text-black text-xs shadow-md">
                  ЛК
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Лазертаг Квест</h4>
                  <p className="text-xs text-zinc-400">@lazertag_kvest_msk</p>
                </div>
              </div>

              {/* Interactive buttons */}
              <div className="px-4 py-3 bg-zinc-900/40 border-b border-zinc-900 flex justify-around items-center">
                <button 
                  onClick={() => toggleLike(activeReel.id)}
                  className="flex flex-col items-center gap-1 group/btn"
                >
                  <Heart className={`w-6 h-6 transition-transform group-hover/btn:scale-125 ${likedReels[activeReel.id] ? 'text-rose-500 fill-rose-500' : 'text-zinc-400'}`} />
                  <span className="text-[10px] font-bold text-zinc-400">{activeReel.likes + (likedReels[activeReel.id] ? 1 : 0)}</span>
                </button>

                <div className="flex flex-col items-center gap-1">
                  <MessageCircle className="w-6 h-6 text-zinc-400" />
                  <span className="text-[10px] font-bold text-zinc-400">{comments[activeReel.id]?.length || 0}</span>
                </div>

                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    alert('Ссылка скопирована в буфер обмена!');
                  }}
                  className="flex flex-col items-center gap-1 group/btn"
                >
                  <Share2 className="w-6 h-6 text-zinc-400 group-hover/btn:scale-110 group-hover/btn:text-cyan-400 transition-colors" />
                  <span className="text-[10px] font-bold text-zinc-400">Поделиться</span>
                </button>
              </div>

              {/* Comments Scrollable Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">Комментарии клиентов</div>
                {(comments[activeReel.id] || []).length === 0 ? (
                  <p className="text-sm text-zinc-600 italic">Пока нет комментариев. Напишите первый!</p>
                ) : (
                  (comments[activeReel.id] || []).map((c, i) => (
                    <div key={i} className="text-xs bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-900/80">
                      <div className="font-bold text-cyan-400 mb-1">{c.author}</div>
                      <div className="text-zinc-300 leading-relaxed">{c.text}</div>
                    </div>
                  ))
                )}
              </div>

              {/* Add Comment Input */}
              <div className="p-4 border-t border-zinc-900 bg-zinc-900/20">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Написать комментарий..."
                    className="flex-1 bg-zinc-900 text-xs text-white border border-zinc-800 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddComment(activeReel.id);
                    }}
                  />
                  <button 
                    onClick={() => handleAddComment(activeReel.id)}
                    className="bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold px-3 py-2 rounded-lg transition-colors"
                  >
                    Отправить
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
