"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Fires `onIntersect` once when the returned ref's element enters the viewport.
 * Used by the About chat animation and any future scroll-triggered effects.
 */
export function useIntersectionObserver(
  onIntersect: () => void,
  options: IntersectionObserverInit = { threshold: 0.25 },
) {
  const ref = useRef<HTMLDivElement>(null);
  const [hasTriggered, setHasTriggered] = useState(false);

  useEffect(() => {
    if (!ref.current || hasTriggered) return;
    const node = ref.current;

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && !hasTriggered) {
          setHasTriggered(true);
          observer.disconnect();
          onIntersect();
        }
      }
    }, options);

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasTriggered, onIntersect, options]);

  return ref;
}
