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

/**
 * The launch command for a browser that prints without a dialog, and keeps polling while the room
 * display covers this window. A page cannot tell whether it was started this way, so it always
 * shows how. See `docs/name-tag-printing.md`.
 */
export const printStationLaunchCommand = [
	'open -na "Google Chrome" --args',
	'--kiosk-printing',
	'--disable-background-timer-throttling',
	'--disable-renderer-backgrounding',
	'--disable-backgrounding-occluded-windows',
	'--user-data-dir="$HOME/chrome-print-station"',
	`${typeof window === 'undefined' ? '' : window.location.origin}/printing-station`,
].join(' ');

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
