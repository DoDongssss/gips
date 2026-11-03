import { useCallback, useRef } from 'react';

/**
 * Makes a vertically scrolling list draggable.
 *
 * - Touch (a tablet): the browser scrolls natively. The element only needs `touch-pan-y`, which also
 *   overrides a `touch-action: none` set on a parent of the kiosk.
 * - Mouse (testing on a desktop): browsers do not drag-scroll with a mouse, so this does it by hand.
 *   A drag never counts as a click, so you do not add an item by accident while scrolling.
 *
 * Use it as a ref: <div ref={dragScroll} className="overflow-y-auto touch-pan-y overscroll-contain">.
 * It is a callback ref, so it also works on elements that mount later (dialogs).
 */
export function useDragScroll<T extends HTMLElement>() {
    const cleanup = useRef<(() => void) | null>(null);

    return useCallback((el: T | null) => {
        cleanup.current?.();
        cleanup.current = null;

        if (!el) return;

        let pressed = false;
        let moved = false;
        let startY = 0;
        let startTop = 0;

        const down = (e: PointerEvent) => {
            // Touch and pen already scroll natively.
            if (e.pointerType !== 'mouse' || e.button !== 0) return;

            pressed = true;
            moved = false;
            startY = e.clientY;
            startTop = el.scrollTop;
        };

        const move = (e: PointerEvent) => {
            if (!pressed) return;

            const dy = e.clientY - startY;

            if (!moved && Math.abs(dy) > 6) {
                moved = true;
                el.style.cursor = 'grabbing';

                try {
                    el.setPointerCapture(e.pointerId);
                } catch {
                    // the pointer is already gone
                }
            }

            if (moved) el.scrollTop = startTop - dy;
        };

        const up = () => {
            pressed = false;
            el.style.cursor = '';
        };

        // After a drag, swallow the click that follows so the button under the cursor is not pressed.
        const click = (e: MouseEvent) => {
            if (!moved) return;

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
