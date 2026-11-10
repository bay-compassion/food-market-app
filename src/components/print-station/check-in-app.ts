/**
 * What the Check-In desktop app (`packages/check-in-app`) puts on `window` for the pages it runs.
 * Its print station prints there, silently and to the label printer, by asking the app; in a
 * browser there is no `checkInApp`, and the page prints itself. The app's
 * `src/shared/print-station.ts` declares the same shape; keep the two in step.
 */
export interface CheckInAppBridge {
	printer: {
		/**
		 * Prints the page as it stands onto one label of this size, and settles once the printer has
		 * it, unlike `window.print()`, which returns at once and leaves no way to know.
		 */
		print(label: { widthMm: number; heightMm: number }): Promise<void>;
	};
}

declare global {
	interface Window {
		checkInApp?: CheckInAppBridge;
	}
}
