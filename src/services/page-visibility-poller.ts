/**
 * Runs a callback on an interval only while the browser page is visible.
 */
export class PageVisibilityPoller {
	private timer: ReturnType<typeof setInterval> | null = null;
	private started = false;
	private readonly visibilityListener = () => this.syncWithPageVisibility();
	private readonly pageHideListener = () => this.pause();
	private readonly pageShowListener = () => this.syncWithPageVisibility();

	constructor(
		private readonly run: () => void,
		private intervalMs: number,
		private readonly onPollingChange: (isPolling: boolean) => void,
	) {}

	start(): void {
		if (!this.started) {
			this.started = true;

			if (typeof document !== 'undefined') {
				document.addEventListener('visibilitychange', this.visibilityListener);
			}

			if (typeof window !== 'undefined') {
				window.addEventListener('pagehide', this.pageHideListener);
				window.addEventListener('pageshow', this.pageShowListener);
			}
		}

		this.syncWithPageVisibility();
	}

	/**
	 * Changes how often the callback runs from now on. A poller that is running keeps going on the
	 * new interval without an extra run in between.
	 */
	setIntervalMs(intervalMs: number): void {
		if (intervalMs === this.intervalMs) {
			return;
		}

		this.intervalMs = intervalMs;

		if (this.timer !== null) {
			clearInterval(this.timer);
			this.timer = setInterval(this.run, this.intervalMs);
		}
	}

	stop(): void {
		this.started = false;

		if (typeof document !== 'undefined') {
			document.removeEventListener('visibilitychange', this.visibilityListener);
		}

		if (typeof window !== 'undefined') {
			window.removeEventListener('pagehide', this.pageHideListener);
			window.removeEventListener('pageshow', this.pageShowListener);
		}
		this.pause();
	}

	private syncWithPageVisibility(): void {
		if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
			this.pause();
		} else {
			this.resume();
		}
	}

	private resume(): void {
		if (this.timer !== null || !this.started) {
			return;
		}

		this.run();
		this.timer = setInterval(this.run, this.intervalMs);
		this.onPollingChange(true);
	}

	private pause(): void {
		if (this.timer !== null) {
			clearInterval(this.timer);
			this.timer = null;
		}
		this.onPollingChange(false);
	}
}
