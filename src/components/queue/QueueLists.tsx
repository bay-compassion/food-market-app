import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';

import { adminTranslations } from '../../adminLocales';
import type { ManualGuest } from '../../services/admin-api';
import { useRootStore } from '../../stores/react/store-context';
import { ManualGuestDialog } from '../admin/ManualGuestDialog';
import { useNow } from '../hooks/use-now';
import { useQueueDesk } from './queue-desk-context';
import { TicketSection } from './TicketSection';

const Lists = styled.div`
	display: grid;
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
 * waiting list's heading.
 */
export const QueueLists = observer(function QueueLists() {
	const t = adminTranslations.en;
	const { admin, translations } = useRootStore();
	const desk = useQueueDesk();
	const { roster } = desk;
	// Chips show whole minutes, so a coarse shared clock is enough; the open ticket keeps its own.
	const now = useNow(30_000);
	const [addingGuest, setAddingGuest] = useState(false);
	const canAddGuest = desk.admissions.length > 0;

	function addGuest(guest: ManualGuest) {
		setAddingGuest(false);
		void admin.addGuest(guest, { locale: translations.locale });
	}

	return (
		<Lists>
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
			{/* Called guests who never came up are, in effect, at the back of the line. */}
			<TicketSection title={t.queueDesk.noShows} guests={roster.noShows} now={now} />
			<TicketSection title={t.queueDesk.notPlaced} guests={roster.notPlaced} now={now} />
			<TicketSection
				title={t.queueDesk.done}
				guests={roster.done}
				emptyText={t.queueDesk.noneDone}
				now={now}
			/>
			<ManualGuestDialog
				open={canAddGuest && addingGuest}
				admissions={desk.admissions}
				busy={desk.isBusy}
				onSubmit={addGuest}
				onClose={() => setAddingGuest(false)}
			/>
		</Lists>
	);
});
