import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';

import { adminTranslations } from '../../adminLocales';
import { languages } from '../../locales';
import type { VisitCommand } from '../../services/visitStateMachine';
import { useTranslation } from '../../stores/react/use-translation';
import type { QueueGuest } from './types';
import { VisitCommandButtons } from './VisitCommandButtons';

export type QueueGuestRowProps = {
	guest: QueueGuest;
	/** Ticks on a timer so the "called N min ago" label keeps counting up. */
	now: number;
	statusLabel: string;
	busy?: boolean;
	showWaitingTime?: boolean;
	onRun: (command: VisitCommand) => void;
};

const Row = styled.article`
	.queue-number {
		display: inline-grid;
		place-items: center;
		min-width: 26px;
		height: 26px;
		margin-inline-end: 6px;
		padding: 0 6px;
		border-radius: var(--radius-pill);
		color: var(--color-on-brand);
		background: var(--color-brand);
		font-size: 13px;
	}

	.waiting-time {
		font-weight: 700;
	}
`;

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
	const base = useTranslation();
	const guestLanguage =
		languages.find((language) => language.code === guest.locale)?.label ?? guest.locale;

	const waitingTime = (() => {
		if (!showWaitingTime || !guest.calledAt) {
			return '';
		}

		const minutes = Math.floor((now - new Date(guest.calledAt).valueOf()) / 60_000);

		return minutes < 1 ? t.calledJustNow : t.calledMinutesAgo.replace('{minutes}', String(minutes));
	})();

	return (
		<Row className="guest-row">
			<div>
				<strong>
					{guest.queuePosition ? <span className="queue-number">{guest.queuePosition}</span> : null}
					{guest.firstName} {guest.lastName}
				</strong>
				<span>
					{guest.phone} · {t.householdCount}: {guest.householdSize} · {base.language}:{' '}
					{guestLanguage}
				</span>
				{waitingTime ? <span className="waiting-time">{waitingTime}</span> : null}
			</div>
			<div className="guest-actions">
				<span className="guest-status">{statusLabel}</span>
				<VisitCommandButtons status={guest.status} disabled={busy} onRun={onRun} />
			</div>
		</Row>
	);
});
