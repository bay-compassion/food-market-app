import styled from '@emotion/styled';
import { Button } from '@mui/material';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';

import { adminTranslations } from '../../adminLocales';
import type { ManualGuest } from '../../services/admin-api';
import { useRootStore } from '../../stores/react/store-context';
import { AdminFeedbackBanner } from '../admin/AdminFeedbackBanner';
import { GuestClaimDialog } from '../admin/GuestClaimDialog';
import { ManualGuestDialog } from '../admin/ManualGuestDialog';
import { useNow } from '../hooks/use-now';
import { useQueueDesk } from './queue-desk-context';
import { QueueDeskHeader } from './QueueDeskHeader';
import { TicketSection } from './TicketSection';
import { TicketSheet } from './TicketSheet';
import { useCloseSession } from './use-close-session';

const Layout = styled.div`
	display: grid;
	gap: 12px;
	/* Room for the call bar fixed along the bottom edge. */
	padding-bottom: calc(88px + env(safe-area-inset-bottom));

	.admin-feedback {
		padding: 12px 14px;
		border-radius: var(--radius-md);
		color: var(--color-brand);
		background: var(--color-surface-soft);
	}

	.add-guest {
		min-height: 36px;
		padding: 0 12px;
		border: 0;
		border-radius: var(--radius-pill);
		color: var(--color-brand);
		background: var(--color-background);
		font-size: 14px;
		font-weight: 700;
	}
`;

const CallBar = styled.div`
	position: fixed;
	inset-inline: 0;
	bottom: 0;
	padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
	background: var(--color-background);
	box-shadow: 0 -8px 24px rgb(1 42 47 / 10%);

	> * {
		max-width: 480px;
		margin-inline: auto;
	}

	.MuiButton-root {
		min-height: 52px;
		font-size: 17px;
	}
`;

/**
 * The queue while service runs: the called and waiting numbers, the finished ones below them, and
 * one big button along the bottom edge to call the next guest — which opens their ticket and name
 * tag straight away. Once everyone is through, that button gives its place to closing the session.
 */
export const QueueLine = observer(function QueueLine() {
	const t = adminTranslations.en;
	const { admin, translations } = useRootStore();
	const desk = useQueueDesk();
	const { roster } = desk;
	// Chips show whole minutes, so a coarse shared clock is enough; the open ticket keeps its own.
	const now = useNow(30_000);
	const [addingGuest, setAddingGuest] = useState(false);
	const canAddGuest = desk.admissions.length > 0;

	const closeSession = useCloseSession();

	function addGuest(guest: ManualGuest) {
		setAddingGuest(false);
		void admin.addGuest(guest, { locale: translations.locale });
	}

	return (
		<Layout>
			<QueueDeskHeader />
			<AdminFeedbackBanner />
			<TicketSection
				title={t.queueDesk.called}
				guests={roster.called}
				emptyText={t.queueDesk.noneCalled}
				now={now}
			/>
			<TicketSection
				title={t.queueDesk.waiting}
				guests={roster.waiting}
				emptyText={t.queueDesk.noneWaiting}
				now={now}
				action={
					canAddGuest ? (
						<button className="add-guest" type="button" onClick={() => setAddingGuest(true)}>
							+ {t.queueDesk.addGuest}
						</button>
					) : null
				}
			/>
			<TicketSection
				title={t.queueDesk.done}
				guests={roster.finished}
				emptyText={t.queueDesk.noneDone}
				now={now}
			/>
			<CallBar>
				{roster.isComplete ? (
					<Button
						type="button"
						variant="contained"
						color="error"
						fullWidth
						disabled={desk.isBusy}
						onClick={() => void closeSession()}
					>
						{t.closeSession}
					</Button>
				) : (
					<Button
						type="button"
						variant="contained"
						fullWidth
						disabled={desk.isBusy || roster.waiting.length === 0}
						onClick={() => void desk.callNext()}
					>
						{t.queueDesk.callNext}
					</Button>
				)}
			</CallBar>
			<TicketSheet />
			<ManualGuestDialog
				open={canAddGuest && addingGuest}
				admissions={desk.admissions}
				busy={desk.isBusy}
				onSubmit={addGuest}
				onClose={() => setAddingGuest(false)}
			/>
			<GuestClaimDialog />
		</Layout>
	);
});
