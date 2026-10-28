import { useEffect, useState, type RefObject } from 'react';

/**
 * Whether a `position: sticky; bottom: 0` element is pinned over content, rather than resting in
 * its place in the flow. Read from whatever follows it: while that is still below the viewport, the
 * element has left its own place to hold the bottom of the screen, and the page scrolls under it.
 *
 * An element with nothing after it reads as resting.
 */
export function usePinnedOverContent(ref: RefObject<HTMLElement | null>): boolean {
	const [pinned, setPinned] = useState(false);

	useEffect(() => {
		const next = ref.current?.nextElementSibling;

		if (!next || typeof IntersectionObserver === 'undefined') {
			return;
		}

		const observer = new IntersectionObserver(([entry]) => {
			if (entry) {
				const viewportBottom = entry.rootBounds?.bottom ?? window.innerHeight;

				setPinned(!entry.isIntersecting && entry.boundingClientRect.top >= viewportBottom);
			}
		});

		observer.observe(next);

		return () => observer.disconnect();
	}, [ref]);

	return pinned;
}
