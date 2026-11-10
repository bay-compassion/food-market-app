import styled from '@emotion/styled';

import { adminTranslations } from '../../adminLocales';

const Setup = styled.details`
	padding: 14px 16px;
	border-radius: var(--radius-md);
	background: var(--color-surface-soft);

	summary {
		font-weight: 700;
		cursor: pointer;
	}

	p {
		margin: 10px 0 8px;
		color: var(--color-text-muted);
		line-height: 1.5;
	}

	pre {
		margin: 0;
		padding: 10px 12px;
		overflow-x: auto;
		border-radius: var(--radius-sm);
		background: var(--color-background);
		font-size: 13px;
		white-space: pre-wrap;
		word-break: break-all;
	}
`;

/** Where the print station runs, on this deploy. */
export const printStationUrl = `${typeof window === 'undefined' ? '' : window.location.origin}/printing-station`;

/** The flag that prints straight to the default printer, using the last dialog print's settings. */
const kioskPrinting = '--kiosk-printing';

/**
 * Starts the station's own Chrome profile at its page, with the given flags. The Check-In Launcher
 * app runs this too: keep `docs/check-in-launcher/launch.sh` in step.
 */
function launchCommand(flags: string[]): string {
	return [
		'open -na "Google Chrome" --args',
		...flags,
		'--disable-background-timer-throttling',
		'--disable-renderer-backgrounding',
		'--disable-backgrounding-occluded-windows',
		'--user-data-dir="$HOME/chrome-print-station"',
		printStationUrl,
	].join(' ');
}

/**
 * The launch command for a browser that prints without a dialog, and keeps polling while the room
 * display covers this window. A page cannot tell whether it was started this way, so it always
 * shows how. See `docs/name-tag-printing.md`.
 */
export const printStationLaunchCommand = launchCommand([kioskPrinting]);

/**
 * The same browser started once without silent printing, so one tag goes through the dialog and
 * the profile saves the printer, paper, and margins that silent printing then reuses.
 */
export const printStationFirstRunCommand = launchCommand([]);

export function PrintStationSetup() {
	const t = adminTranslations.en.queueDesk.printStation;

	return (
		<Setup>
			<summary>{t.setupTitle}</summary>
			<p>{t.setup}</p>
			<pre>{printStationLaunchCommand}</pre>
		</Setup>
	);
}
