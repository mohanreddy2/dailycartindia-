import React, { useState } from 'react';
import { cn } from '../../lib/utils';

/** Image with soft gradient fallback when URL 404s / fails. */
export function Thumb({ src, alt = '', className, imgClassName, tone = 'mart' }) {
  const [failed, setFailed] = useState(false);
  const bg = tone === 'serve'
    ? 'bg-gradient-to-br from-emerald-50 to-teal-100'
    : 'bg-gradient-to-br from-orange-50 to-amber-100';
  return (
    <div className={cn('overflow-hidden', bg, className)}>
      {src && !failed && (
        <img
          src={src}
          alt={alt}
          className={cn('h-full w-full object-cover', imgClassName)}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
