'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * `.reveal` sınıflı tüm öğelere görünür olduklarında `is-visible` ekler.
 * IntersectionObserver desteklenmiyorsa içerik doğrudan gösterilir —
 * içerik hiçbir koşulda gizli kalmaz.
 */
export function RevealProvider() {
  const pathname = usePathname();

  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('.reveal'));

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || !('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
    );

    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [pathname]);

  return null;
}
