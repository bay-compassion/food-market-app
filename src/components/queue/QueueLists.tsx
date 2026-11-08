import styled from '@emotion/styled';
import useMediaQuery from '@mui/material/useMediaQuery';
import { observer } from 'mobx-react-lite';

import { adminTranslations } from '../../adminLocales';
import type { ManualGuest } from '../../services/admin-api';
import { useRootStore } from '../../stores/react/store-context';
import { wideLayoutQuery } from '../admin/admin-layout';
import { ManualGuestDialog } from '../admin/ManualGuestDialog';
import { useNow } from '../hooks/use-now';
import { useQueueDesk } from './queue-desk-context';
import { QueueHouseholdService } from './QueueHouseholdService';
import { TicketSection } from './TicketSection';

const Lists = styled.div`
	display: grid;
	grid-template-columns: minmax(0, 1fr);
	gap: 12px;

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

/**
 * The line's tickets: the called and waiting numbers; then no-shows, guests the draw did not
 * place, and the finished ones, each in their own section — with adding a guest by hand from the
 * waiting list's heading on a desk. On a phone that sits in the call bar's menu.
 */
export const QueueLists = observer(function QueueLists() {
	const t = adminTranslations.en;
	const { admin, translations, session } = useRootStore();
	const desk = useQueueDesk();
	const { roster } = desk;
	// Chips show whole minutes, so a coarse shared clock is enough; the open ticket keeps its own.
	const now = useNow(30_000);
	const isWide = useMediaQuery(wideLayoutQuery);

	function addGuest(guest: ManualGuest) {
		desk.closeAddGuest();
		void admin.addGuest(guest, { locale: translations.locale });
	}

	return (
		<Lists>
			<TicketSection
				id="called"
				title={t.queueDesk.called}
				guests={roster.called}
				emptyText={t.queueDesk.noneCalled}
				now={now}
			/>
			<TicketSection
				id="waiting"
				title={t.queueDesk.waiting}
				guests={roster.waiting}
				emptyText={t.queueDesk.noneWaiting}
				now={now}
				action={
					desk.canAddGuest && isWide ? (
						<button className="add-guest" type="button" onClick={() => desk.openAddGuest()}>
							+ {t.queueDesk.addGuest}
						</button>
					) : null
				}
			/>
			{/* Called guests who never came up are, in effect, at the back of the line. */}
			<TicketSection id="noShows" title={t.queueDesk.noShows} guests={roster.noShows} now={now} />
			<TicketSection
				id="notPlaced"
				title={t.queueDesk.notPlaced}
				guests={roster.notPlaced}
				now={now}
			/>
			<TicketSection
				id="done"
				title={t.queueDesk.done}
				guests={roster.done}
				emptyText={t.queueDesk.noneDone}
				now={now}
			/>
			{session.currentState?.event ? (
				<QueueHouseholdService
					key={session.currentState.event.id}
					marketEventId={session.currentState.event.id}
				/>
			) : null}
			<ManualGuestDialog
				open={desk.isAddingGuest}
				admissions={desk.admissions}
				busy={desk.isBusy}
				onSubmit={addGuest}
				onClose={() => desk.closeAddGuest()}
			/>
		</Lists>
	);
});
