import { useCallback, useRef } from 'react';

/** Mouse drag-scroll for overflow lists; touch uses native scrolling. */
export function useDragScroll<T extends HTMLElement>() {
    const cleanup = useRef<(() => void) | null>(null);

    return useCallback((el: T | null) => {
        cleanup.current?.();
        cleanup.current = null;

        if (!el) {
            return;
        }

        let pressed = false;
        let moved = false;
        let startY = 0;
        let startTop = 0;

        const down = (e: PointerEvent) => {
            if (e.pointerType !== 'mouse' || e.button !== 0) {
                return;
            }

            pressed = true;
            moved = false;
            startY = e.clientY;
            startTop = el.scrollTop;
        };

        const move = (e: PointerEvent) => {
            if (!pressed) {
                return;
            }

            const dy = e.clientY - startY;

            if (!moved && Math.abs(dy) > 6) {
                moved = true;
                el.style.cursor = 'grabbing';

                try {
                    el.setPointerCapture(e.pointerId);
                } catch {
                    //
                }
            }

            if (moved) {
                el.scrollTop = startTop - dy;
            }
        };

        const up = () => {
            pressed = false;
            el.style.cursor = '';
        };

        const click = (e: MouseEvent) => {
            if (!moved) {
                return;
            }

            e.stopPropagation();
            e.preventDefault();
            moved = false;
        };

        const dragstart = (e: Event) => e.preventDefault();

        el.addEventListener('pointerdown', down);
        el.addEventListener('pointermove', move);
        el.addEventListener('pointerup', up);
        el.addEventListener('pointercancel', up);
        el.addEventListener('click', click, true);
        el.addEventListener('dragstart', dragstart);

        cleanup.current = () => {
            el.removeEventListener('pointerdown', down);
            el.removeEventListener('pointermove', move);
            el.removeEventListener('pointerup', up);
            el.removeEventListener('pointercancel', up);
            el.removeEventListener('click', click, true);
            el.removeEventListener('dragstart', dragstart);
        };
    }, []);
}
