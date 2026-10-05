import { useEffect } from 'react';

/**
 * Keeps the screen from dimming or sleeping while the calling component is mounted — for a display
 * nobody touches, which would otherwise go dark mid-session.
 *
 * The browser drops the lock whenever the page is hidden, so it is taken again each time the page
 * comes back. Where the Screen Wake Lock API is missing or the request is refused, this does
 * nothing and the device's own sleep setting applies.
 */
export function useScreenWakeLock(): void {
	useEffect(() => {
		if (!('wakeLock' in navigator)) {
			return;
		}
		let sentinel: WakeLockSentinel | null = null;
		let disposed = false;

		const acquire = async () => {
			if (document.visibilityState !== 'visible' || (sentinel && !sentinel.released)) {
				return;
			}

			try {
				const lock = await navigator.wakeLock.request('screen');

				if (disposed) {
					void lock.release();
				} else {
					sentinel = lock;
				}
			} catch {
				// Refused (battery saver, no user activation on some browsers): the screen may sleep.
			}
		};
		const onVisibilityChange = () => void acquire();

		void acquire();
		document.addEventListener('visibilitychange', onVisibilityChange);

		return () => {
			disposed = true;
			document.removeEventListener('visibilitychange', onVisibilityChange);
			void sentinel?.release();
		};
	}, []);
}
