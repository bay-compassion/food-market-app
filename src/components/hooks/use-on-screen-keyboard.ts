import { useSyncExternalStore } from 'react';

/**
 * More than a browser's collapsing toolbar takes, and less than the smallest phone keyboard — even
 * a numeric keypad on an iPhone SE stands well over 200 px.
 */
const keyboardThreshold = 150;

/**
 * Whether a viewport this much shorter than the window means a keyboard is covering it. Both iOS
 * Safari and Android Chrome leave the window's height alone and shrink only the visual viewport
 * when a keyboard opens. Pinch zoom shrinks it too, so its height is taken back to page pixels
 * through `scale` first.
 */
export function coversViewport(
	windowHeight: number,
	viewport: Pick<VisualViewport, 'height' | 'scale'>,
): boolean {
	return windowHeight - viewport.height * viewport.scale > keyboardThreshold;
}

function subscribe(onChange: () => void): () => void {
	window.visualViewport?.addEventListener('resize', onChange);

	return () => window.visualViewport?.removeEventListener('resize', onChange);
}

const isOpen = () =>
	window.visualViewport ? coversViewport(window.innerHeight, window.visualViewport) : false;

/**
 * Whether the on-screen keyboard is up. Read from the viewport rather than from focus: focus outlives
 * the keyboard — a select keeps it after iOS's picker closes, a number box after its keypad is
 * dismissed — so a guest would otherwise have to know to tap somewhere blank to get it back.
 */
export function useOnScreenKeyboard(): boolean {
	return useSyncExternalStore(subscribe, isOpen, () => false);
}
