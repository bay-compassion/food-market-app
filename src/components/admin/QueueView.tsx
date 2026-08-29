import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';

import { adminTranslations } from '../../adminLocales';
import type { GuestAdmission } from '../../services/guestAdmission';
import type { VisitCommand, VisitStatus } from '../../services/visitStateMachine';
import { AppButton } from '../AppButton';
import { AddGuestSection } from './AddGuestSection';
import { QueueCallNext } from './QueueCallNext';
import { QueueGuestRow } from './QueueGuestRow';
import type { ManualGuest, QueueGuest } from './types';

export type QueueViewProps = {
	guests: QueueGuest[];
	counts: Partial<Record<VisitStatus, number>>;
	statusLabels: Record<VisitStatus, string>;
	serviceStarted: boolean;
	admissions: GuestAdmission[];
	busy?: boolean;
	onCallNext: (count: number) => void;
	onRun: (guest: QueueGuest, command: VisitCommand) => void;
	onAddGuest: (guest: ManualGuest) => void;
	onCloseSession: () => void;
	onNavigateCurrentSession: () => void;
};

const resolvedStatuses: VisitStatus[] = ['served', 'no_show', 'not_placed', 'cancelled'];

const Summary = styled.p`
	margin: 0 0 14px;
	color: var(--color-text-subtle);
	font-weight: 700;
	font-size: 14px;
`;

const Count = styled.span`
	display: grid;
	place-items: center;
	min-width: 34px;
	height: 34px;
	padding: 0 10px;
	border-radius: var(--radius-pill);
	color: var(--color-on-brand);
	background: var(--color-brand);
	font-weight: 700;
`;

const ResolvedToggle = styled.button`
	border: 0;
	padding: 0;
	color: var(--color-brand);
	background: transparent;
	font-weight: 700;
	text-decoration: underline;
`;

const Empty = styled.section`
	display: grid;
	gap: 14px;
	justify-items: start;

	p {
		color: var(--color-text-subtle);
		line-height: 1.5;
	}
`;

const StandaloneAction = styled.div`
	margin-top: 26px;
`;

/**
 * The screen a worker actually uses during service. Everything down to the first guest rows is
 * deliberately compact: on a phone this is the only screen they look at, so the controls have to
 * clear the fold.
 */
export const QueueView = observer(function QueueView({
	guests,
	counts,
	statusLabels,
	serviceStarted,
	admissions,
	busy,
	onCallNext,
	onRun,
	onAddGuest,
	onCloseSession,
	onNavigateCurrentSession,
}: QueueViewProps) {
	const t = adminTranslations.en;
	const [callBatchSize, setCallBatchSize] = useState(1);
	const [showResolved, setShowResolved] = useState(false);
	// Drives the "called N min ago" labels. A minute's resolution needs nothing finer than this.
	const [now, setNow] = useState(() => Date.now());

	useEffect(() => {
		const timer = setInterval(() => setNow(Date.now()), 30_000);

		return () => clearInterval(timer);
	}, []);

	if (!serviceStarted) {
		return (
			<Empty className="admin-section queue-empty">
				<h2>{t.queue}</h2>
				<p>{t.queueNotStarted}</p>
				<AppButton
					type="button"
					variant="secondary"
					onClick={onNavigateCurrentSession}
					label={t.goToCurrentSession}
				/>
			</Empty>
		);
	}

	const queueCalled = guests
		.filter((guest) => guest.status === 'called')
		.sort((first, second) => (first.calledAt ?? '').localeCompare(second.calledAt ?? ''));
	const queueWaiting = guests
		.filter((guest) => guest.status === 'waiting')
		.sort(
			(first, second) =>
				(first.queuePosition ?? Number.MAX_SAFE_INTEGER) -
				(second.queuePosition ?? Number.MAX_SAFE_INTEGER),
		);
	const queueResolved = guests.filter((guest) => resolvedStatuses.includes(guest.status));
	const summary = [
		`${counts.waiting ?? 0} ${t.waitingQueue}`,
		`${counts.called ?? 0} ${t.calledNow}`,
		`${counts.served ?? 0} ${t.served}`,
	].join(' · ');

	function guestRows(rows: QueueGuest[], showWaitingTime = false) {
		return rows.map((guest) => (
			<QueueGuestRow
				key={guest.id}
				guest={guest}
				now={now}
				statusLabel={statusLabels[guest.status]}
				busy={busy}
				showWaitingTime={showWaitingTime}
				onRun={(command) => onRun(guest, command)}
			/>
		));
	}

	return (
		<>
			<Summary className="queue-summary">{summary}</Summary>
			<QueueCallNext
				count={callBatchSize}
				onCountChange={setCallBatchSize}
				waitingCount={queueWaiting.length}
				busy={busy}
				onCall={() => onCallNext(callBatchSize)}
			/>

			<section className="admin-section">
				<div className="section-heading">
					<h2>{t.calledNow}</h2>
					<Count className="queue-count">{queueCalled.length}</Count>
				</div>
				{queueCalled.length ? (
					<div className="guest-list">{guestRows(queueCalled, true)}</div>
				) : (
					<p className="empty-state">{t.noCalledGuests}</p>
				)}
			</section>

			<section className="admin-section">
				<div className="section-heading">
					<h2>{t.waitingQueue}</h2>
					<Count className="queue-count">{queueWaiting.length}</Count>
				</div>
				{queueWaiting.length ? (
					<div className="guest-list">{guestRows(queueWaiting)}</div>
				) : (
					<p className="empty-state">{t.noWaitingGuests}</p>
				)}
			</section>

			<AddGuestSection admissions={admissions} busy={busy} onAddGuest={onAddGuest} />

			<section className="admin-section">
				<ResolvedToggle
					className="resolved-toggle"
					type="button"
					onClick={() => setShowResolved(!showResolved)}
				>
					{showResolved ? t.hideResolved : t.showResolved} ({queueResolved.length})
				</ResolvedToggle>
				{showResolved && queueResolved.length ? (
					<div className="guest-list">{guestRows(queueResolved)}</div>
				) : null}
			</section>

			<StandaloneAction className="standalone-action">
				<AppButton type="button" disabled={busy} onClick={onCloseSession} label={t.closeSession} />
			</StandaloneAction>
		</>
	);
});
