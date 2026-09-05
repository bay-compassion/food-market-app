import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';

import { adminTranslations } from '../../adminLocales';
import type { GuestAdmission } from '../../services/guestAdmission';
import type { VisitCommand, VisitStatus } from '../../services/visitStateMachine';
import { useRootStore } from '../../stores/react/store-context';
import { useManualGuestForm } from './AddGuestSection';
import { GuestDatabaseGrid } from './GuestDatabaseGrid';
import { ManualGuestDialog } from './ManualGuestDialog';
import type { ManualGuest, QueueGuest } from './types';

export type GuestDatabaseViewProps = {
	statusLabels: Record<VisitStatus, string>;
	admissions: GuestAdmission[];
	onRun: (guest: QueueGuest, command: VisitCommand) => void;
	onAddGuest: (guest: ManualGuest) => void;
};

/*
 * The card's own padding would double up with the grid's, so the section only keeps it for the
 * heading and lets the grid run to the card's edges.
 */
const Section = styled.section`
	padding-right: 0;
	padding-left: 0;

	.section-heading {
		padding: 0 20px;
	}
`;

/** Every guest on record, sortable and filterable, with whatever action their visit allows. */
export const GuestDatabaseView = observer(function GuestDatabaseView({
	statusLabels,
	admissions,
	onRun,
	onAddGuest,
}: GuestDatabaseViewProps) {
	const t = adminTranslations.en;
	const { admin } = useRootStore();
	// Composed here rather than through `AddGuestSection` so the button sits in the heading beside
	// the screen's title, where a worker meets it before scrolling the list.
	const addGuestForm = useManualGuestForm(admissions);

	function addGuest(guest: ManualGuest) {
		addGuestForm.close();
		onAddGuest(guest);
	}

	return (
		<Section className="admin-section guest-section">
			<div className="section-heading">
				<h2>{t.allGuests}</h2>
				{addGuestForm.canAdd ? (
					<button className="add-guest-button" type="button" onClick={addGuestForm.open}>
						+ {t.addGuest}
					</button>
				) : null}
			</div>
			<GuestDatabaseGrid
				guests={admin.guests}
				statusLabels={statusLabels}
				canExport={admin.can('export:guest-data')}
				busy={admin.isBusy}
				onRun={onRun}
			/>
			<ManualGuestDialog
				open={addGuestForm.isOpen}
				admissions={admissions}
				busy={admin.isBusy}
				onSubmit={addGuest}
				onClose={addGuestForm.close}
			/>
		</Section>
	);
});
