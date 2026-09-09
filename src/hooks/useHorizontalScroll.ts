import { useCallback, useRef } from 'react';

/**
 * A hook that converts vertical mouse wheel scroll into horizontal scroll
 * for horizontal containers on PC. It works perfectly even with conditionally
 * rendered elements thanks to the callback ref pattern.
 */
export function useHorizontalScroll() {
  const prevNodeRef = useRef<HTMLElement | null>(null);

  const ref = useCallback((node: HTMLElement | null) => {
    // 1. Clean up old listener if node changed or unmounted
    if (prevNodeRef.current) {
      const oldNode = prevNodeRef.current;
      const oldListener = (oldNode as any)._onWheelListener;
      if (oldListener) {
        try {
          oldNode.removeEventListener('wheel', oldListener);
        } catch (err) {
          console.error('Error removing wheel listener:', err);
        }
      }
    }

    // 2. Attach new listener if element is mounted
    if (node) {
      const onWheel = (e: WheelEvent) => {
        if (e.deltaY === 0) return;
        
        // Only convert vertical scroll if the container is indeed horizontally scrollable
        const canScrollHorizontally = node.scrollWidth > node.clientWidth;
        if (canScrollHorizontally) {
          e.preventDefault();
          node.scrollLeft += e.deltaY * 0.95; // scaling for elegant scroll speed
        }
      };
      
      node.addEventListener('wheel', onWheel, { passive: false });
      (node as any)._onWheelListener = onWheel;
    }

    prevNodeRef.current = node;
  }, []);

  return ref;
}
