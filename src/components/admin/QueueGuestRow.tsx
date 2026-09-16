import { TableCell } from '@mui/material';
import { observer } from 'mobx-react-lite';

import { adminTranslations } from '../../adminLocales';
import { languages } from '../../locales';
import type { VisitCommand } from '../../services/visitStateMachine';
import { GuestTableRow } from './GuestTableRow';
import { QueueGuestActions } from './QueueGuestActions';
import type { QueueGuest } from './types';

export type QueueGuestRowProps = {
	guest: QueueGuest;
	/** Ticks on a timer so the "called N min ago" label keeps counting up. */
	now: number;
	/**
	 * Shown as a chip when the list around the row does not already say what the status is — the
	 * finished list mixes served and no-show guests, the called and waiting lists do not.
	 */
	statusLabel?: string;
	busy?: boolean;
	showWaitingTime?: boolean;
	onRun: (command: VisitCommand) => void;
};

/** One guest in the queue: who they are, where they stand, and what a worker can do about it. */
export const QueueGuestRow = observer(function QueueGuestRow({
	guest,
	now,
	statusLabel,
	busy,
	showWaitingTime,
	onRun,
}: QueueGuestRowProps) {
	const t = adminTranslations.en;
	const guestLanguage =
		languages.find((language) => language.code === guest.locale)?.englishLabel ?? guest.locale;

	const waitingTime = (() => {
		if (!showWaitingTime || !guest.calledAt) {
			return null;
		}

		const minutes = String(Math.floor((now - new Date(guest.calledAt).valueOf()) / 60_000));

		return minutes === '0'
			? { short: t.calledJustNowShort, full: t.calledJustNow }
			: {
					short: t.calledMinutesShort.replace('{minutes}', minutes),
					full: t.calledMinutesAgo.replace('{minutes}', minutes),
				};
	})();

	return (
		<GuestTableRow className="queue-guest-row">
			<TableCell className="identity-cell">
				<div className="identity">
					<div className="name">
						{guest.queuePosition ? (
							<span className="queue-number">{guest.queuePosition}</span>
						) : null}
						<span>
							{guest.firstName} {guest.lastName}
						</span>
						{statusLabel ? <span className="status-chip">{statusLabel}</span> : null}
					</div>
					<div className="details">
						<span>
							{t.householdCount} {guest.householdSize}
						</span>
						<span>{guestLanguage}</span>
					</div>
				</div>
			</TableCell>
			<TableCell className="actions-cell">
				<div className="actions">
					{waitingTime ? (
						<span className="waiting-time" title={waitingTime.full} aria-label={waitingTime.full}>
							{waitingTime.short}
						</span>
					) : null}
					<QueueGuestActions guest={guest} disabled={busy} onRun={onRun} />
				</div>
			</TableCell>
		</GuestTableRow>
	);
});
