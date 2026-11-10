import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';

import { NameTag } from '../../models/name-tag';
import { NameTagPrint } from '../queue/NameTagPrint';
import type { CheckInAppBridge } from './check-in-app';
import { usePrintStation } from './print-station-context';

/** How long to wait before trying the desktop app's printer again after it failed. */
const retryAfterMs = 3_000;

/** Waits for the next frame, by which point a label just rendered is laid out on the page. */
function nextFrame(): Promise<void> {
	return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

/**
 * Prints through the Check-In desktop app until the printer takes the tag, or until `cancelled`.
 * A print that fails, to a printer that is off or out of labels, is tried again rather than
 * dropped. Resolves whether the tag printed.
 */
async function printThroughApp(
	printer: CheckInAppBridge['printer'],
	cancelled: () => boolean,
): Promise<boolean> {
	while (!cancelled()) {
		try {
			await printer.print(NameTag.label);

			return true;
		} catch {
			await new Promise((resolve) => setTimeout(resolve, retryAfterMs));
		}
	}

	return false;
}

/**
 * Prints the waiting tags one at a time. Each is put on the page at the label's size, then — once
 * its fonts have loaded, or the first tag of the day prints in a fallback face — sent to the
 * printer, and only then marked printed so the next one takes its place.
 *
 * In the Check-In desktop app, the app prints it, silently, to the label printer. In a browser
 * started with `--kiosk-printing` the print goes straight to the default printer. Without either,
 * each tag opens the print dialog, and the next waits until that one is dealt with.
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

			const printer = window.checkInApp?.printer;

			// The desktop app prints the page as it stands, after a moment; marking the tag printed
			// before it finishes would put the next tag on the page in its place.
			if (printer) {
				if (!(await printThroughApp(printer, () => cancelled))) {
					return;
				}
			} else {
				window.print();
			}

			await station.printed(job);
		})();

		return () => {
			cancelled = true;
		};
	}, [job, station]);

	return tag ? <NameTagPrint tag={tag} /> : null;
});
