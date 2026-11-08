import { useEffect, useRef, type MouseEvent, type PointerEvent, type RefObject } from 'react';

/** How far a press has to travel down before it counts as a drag rather than a tap. */
const dragThreshold = 8;
/** A release past this share of the sheet's height dismisses it… */
const distanceToDismiss = 0.3;
/** …and so does a flick faster than this, in pixels per millisecond, however short. */
const speedToDismiss = 0.5;

/**
 * Drags a bottom sheet down to dismiss it, from a grip along its top edge.
 *
 * The handlers go on the grip, which needs `touch-action: none` so a phone hands the gesture to
 * the page rather than scrolling; the rest of the sheet scrolls as usual. The sheet follows the
 * finger, and springs back if let go short of dismissing.
 *
 * The drag is followed on the window from the press onwards, since a quick one leaves the grip
 * before its first move. Nothing is captured, so a tap on a control inside the grip still clicks it
 * — and a drag that ends on one does not.
 */
export function useSwipeToDismiss<T extends HTMLElement>(
	sheet: RefObject<T | null>,
	onDismiss: () => void,
) {
	const stopFollowing = useRef<(() => void) | null>(null);
	const wasDragged = useRef(false);

	// A sheet that unmounts mid-drag leaves no listeners behind.
	useEffect(() => () => stopFollowing.current?.(), []);

	function settle(offset: number) {
		const element = sheet.current;

		if (element) {
			element.style.transform = offset ? `translateY(${offset}px)` : '';
		}
	}

	function follow(pointerId: number, startY: number, startTime: number) {
		let isDragging = false;

		const move = (event: globalThis.PointerEvent) => {
			if (event.pointerId !== pointerId) {
				return;
			}

			const offset = event.clientY - startY;

			isDragging ||= offset >= dragThreshold;

			if (isDragging) {
				settle(Math.max(0, offset));
			}
		};

		const end = (event: globalThis.PointerEvent) => {
			if (event.pointerId !== pointerId) {
				return;
			}

			stop();
			settle(0);

			if (!isDragging || event.type === 'pointercancel') {
				return;
			}

			wasDragged.current = true;

			const distance = Math.max(0, event.clientY - startY);
			const speed = distance / Math.max(1, event.timeStamp - startTime);
			const height = sheet.current?.offsetHeight ?? Infinity;

			if (distance > height * distanceToDismiss || speed > speedToDismiss) {
				onDismiss();
			}
		};

		const stop = () => {
			window.removeEventListener('pointermove', move);
			window.removeEventListener('pointerup', end);
			window.removeEventListener('pointercancel', end);
			stopFollowing.current = null;
		};

		window.addEventListener('pointermove', move);
		window.addEventListener('pointerup', end);
		window.addEventListener('pointercancel', end);
		stopFollowing.current = stop;
	}

	return {
		onPointerDown(event: PointerEvent<HTMLElement>) {
			if (event.button !== 0) {
				return;
			}

			stopFollowing.current?.();
			wasDragged.current = false;
			follow(event.pointerId, event.clientY, event.timeStamp);
		},
		onClickCapture(event: MouseEvent<HTMLElement>) {
			if (wasDragged.current) {
				wasDragged.current = false;
				event.stopPropagation();
				event.preventDefault();
			}
		},
	};
}
