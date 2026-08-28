import React, { useState } from 'react';

interface ProductImageProps {
  src?: string | null;
  alt?: string;
  className?: string;
  imageClassName?: string;
  fallbackLogoUrl?: string;
}

/**
 * Universal Product Image with sleek branded fallback using the shop logo
 * instead of emojis across all catalog, cart, detail modal and orders views.
 */
export const ProductImage: React.FC<ProductImageProps> = ({
  src,
  alt = 'Товар',
  className = 'w-full h-full',
  imageClassName = 'w-full h-full object-contain p-1.5',
  fallbackLogoUrl = '/logo.png',
}) => {
  const [imageError, setImageError] = useState(false);

  // If a valid custom photo url is provided and didn't error, display it; otherwise display the sleek logo placeholder
  const hasCustomImage = Boolean(src && src.trim() && !imageError && src !== '/logo.png');

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden bg-gradient-to-b from-purple-950/40 via-[#151221] to-black/60 border border-white/5 select-none ${className}`}
    >
      {hasCustomImage ? (
        <img
          src={src!}
          alt={alt}
          onError={() => setImageError(true)}
          className={`${imageClassName} transition-transform duration-200`}
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="relative w-full h-full flex items-center justify-center p-1.5 group">
          {/* Subtle soft backdrop glow */}
          <div className="absolute inset-0 bg-gradient-to-tr from-purple-600/10 via-transparent to-orange-500/10 pointer-events-none" />
          <img
            src={fallbackLogoUrl || '/logo.png'}
            alt="Puff Paradise Logo"
            className="w-full h-full object-contain filter drop-shadow-[0_2px_8px_rgba(168,85,247,0.3)] transition-transform duration-200 group-hover:scale-105"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        </div>
      )}
    </div>
  );
};
