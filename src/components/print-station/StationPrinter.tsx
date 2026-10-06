import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';

import { NameTagPrint } from '../queue/NameTagPrint';
import { usePrintStation } from './print-station-context';

/** Waits for the next frame, by which point a label just rendered is laid out on the page. */
function nextFrame(): Promise<void> {
	return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

/**
 * Prints the waiting tags one at a time. Each is put on the page at the label's size, then — once
 * its fonts have loaded, or the first tag of the day prints in a fallback face — sent to the
 * printer, and only then marked printed so the next one takes its place.
 *
 * In a browser started with `--kiosk-printing` the print goes straight to the default printer.
 * Without it, each tag opens the print dialog, and the next waits until that one is dealt with.
 */
export const StationPrinter = observer(function StationPrinter() {
	const station = usePrintStation();
	const job = station.current;
	const tag = station.currentTag;

	useEffect(() => {
		if (!job) {
			return;
		}

		let cancelled = false;

		void (async () => {
			// Absent outside a real browser engine; there is nothing to wait for there.
			await document.fonts?.ready;
			await nextFrame();

			if (cancelled) {
				return;
			}

			window.print();
			await station.printed(job);
		})();

		return () => {
			cancelled = true;
		};
	}, [job, station]);

	return tag ? <NameTagPrint tag={tag} /> : null;
});
