import { useCallback, useSyncExternalStore } from 'react';

function subscribe(onChange: () => void): () => void {
	document.addEventListener('fullscreenchange', onChange);

	return () => document.removeEventListener('fullscreenchange', onChange);
}

const isFullscreen = () => document.fullscreenElement !== null;

export type Fullscreen = {
	/** False where the Fullscreen API is missing or blocked, such as Safari before 16.4. */
	supported: boolean;
	active: boolean;
	enter: () => void;
};

/**
 * Whether the page is full screen, and a way in. The way out is the browser's own — Escape, or its
 * exit control — so the page never has to show one.
 */
export function useFullscreen(): Fullscreen {
	const active = useSyncExternalStore(subscribe, isFullscreen, () => false);
	const enter = useCallback(() => {
		document.documentElement.requestFullscreen().catch(() => {
			// Refused (no user activation, or a browser that advertises the API but blocks it).
		});
	}, []);

	return { supported: document.fullscreenEnabled === true, active, enter };
}
