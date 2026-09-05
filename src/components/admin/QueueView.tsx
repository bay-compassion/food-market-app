import styled from '@emotion/styled';
import { Button, MenuItem } from '@mui/material';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';

import { adminTranslations } from '../../adminLocales';
import type { GuestAdmission } from '../../services/guestAdmission';
import type { VisitCommand, VisitStatus } from '../../services/visitStateMachine';
import { useManualGuestForm } from './AddGuestSection';
import { ManualGuestDialog } from './ManualGuestDialog';
import { OverflowMenu } from './OverflowMenu';
import { QueueCallNext } from './QueueCallNext';
import { QueueGuestRow } from './QueueGuestRow';
import { QueueSection } from './QueueSection';
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

type QueueList = 'called' | 'waiting' | 'resolved';

const resolvedStatuses: VisitStatus[] = ['served', 'no_show', 'not_placed', 'cancelled'];

const Header = styled.div`
	display: grid;
	grid-template-columns: minmax(0, 1fr) auto;
	gap: 4px;
	align-items: center;
`;

const Summary = styled.p`
	margin: 10px 0 0;
	color: var(--color-text-subtle);
	font-size: 13px;
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
	// Every list starts open; a worker folds one away for the rest of the service if they like.
	const [collapsed, setCollapsed] = useState<Partial<Record<QueueList, boolean>>>({});
	const addGuestForm = useManualGuestForm(admissions);
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
				<Button type="button" variant="outlined" onClick={onNavigateCurrentSession}>
					{t.goToCurrentSession}
				</Button>
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

	function toggle(list: QueueList) {
		setCollapsed({ ...collapsed, [list]: !collapsed[list] });
	}

	function addGuest(guest: ManualGuest) {
		addGuestForm.close();
		onAddGuest(guest);
	}

	function guestRows(
		rows: QueueGuest[],
		options: { waitingTime?: boolean; status?: boolean } = {},
	) {
		return rows.map((guest) => (
			<QueueGuestRow
				key={guest.id}
				guest={guest}
				now={now}
				statusLabel={options.status ? statusLabels[guest.status] : undefined}
				busy={busy}
				showWaitingTime={options.waitingTime}
				onRun={(command) => onRun(guest, command)}
			/>
		));
	}

	return (
		<>
			<Header>
				<QueueCallNext
					count={callBatchSize}
					onCountChange={setCallBatchSize}
					waitingCount={queueWaiting.length}
					busy={busy}
					onCall={() => onCallNext(callBatchSize)}
				/>
				<OverflowMenu label={t.sessionActions} disabled={busy}>
					{(closeMenu) => (
						<MenuItem
							sx={{ color: 'error.main', fontWeight: 700 }}
							onClick={() => {
								closeMenu();
								onCloseSession();
							}}
						>
							{t.closeSession}
						</MenuItem>
					)}
				</OverflowMenu>
			</Header>
			<Summary className="queue-summary">{summary}</Summary>

			<QueueSection
				title={t.calledNow}
				count={queueCalled.length}
				emptyText={t.noCalledGuests}
				open={!collapsed.called}
				onToggle={() => toggle('called')}
			>
				{guestRows(queueCalled, { waitingTime: true })}
			</QueueSection>

			<QueueSection
				title={t.waitingQueue}
				count={queueWaiting.length}
				emptyText={t.noWaitingGuests}
				open={!collapsed.waiting}
				onToggle={() => toggle('waiting')}
				action={
					addGuestForm.canAdd ? (
						<button className="add-guest-button" type="button" onClick={addGuestForm.open}>
							+ {t.addGuest}
						</button>
					) : null
				}
			>
				{guestRows(queueWaiting)}
			</QueueSection>

			<QueueSection
				title={t.resolvedGuests}
				count={queueResolved.length}
				emptyText={t.noResolvedGuests}
				open={!collapsed.resolved}
				onToggle={() => toggle('resolved')}
			>
				{guestRows(queueResolved, { status: true })}
			</QueueSection>

			<ManualGuestDialog
				open={addGuestForm.isOpen}
				admissions={admissions}
				busy={busy}
				onSubmit={addGuest}
				onClose={addGuestForm.close}
			/>
		</>
	);
});
