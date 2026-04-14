'use client';

import { useEffect } from 'react';

/**
 * Activates the Tekken 8 cursor stalker (#stalker element).
 * The element is rendered in layout; this component just adds the
 * mousemove listener to translate it.
 */
export function CursorStalker() {
  useEffect(() => {
    const stalker = document.getElementById('stalker');
    if (!stalker) return;

    function onMove(e: MouseEvent) {
      stalker!.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
    }

    function onEnterLink() {
      stalker!.classList.add('hover');
      stalker!.style.opacity = '0.8';
    }

    function onLeaveLink() {
      stalker!.classList.remove('hover');
      stalker!.style.opacity = '0.3';
    }

    document.addEventListener('mousemove', onMove);

    // Detect hoverable elements
    const observer = new MutationObserver(() => {
      document.querySelectorAll('a, button, [role="button"]').forEach((el) => {
        if (!(el as HTMLElement).dataset.stalkerBound) {
          (el as HTMLElement).dataset.stalkerBound = '1';
          el.addEventListener('mouseenter', onEnterLink);
          el.addEventListener('mouseleave', onLeaveLink);
        }
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // Initial pass
    document.querySelectorAll('a, button, [role="button"]').forEach((el) => {
      (el as HTMLElement).dataset.stalkerBound = '1';
      el.addEventListener('mouseenter', onEnterLink);
      el.addEventListener('mouseleave', onLeaveLink);
    });

    return () => {
      document.removeEventListener('mousemove', onMove);
      observer.disconnect();
    };
  }, []);

  return null;
}
