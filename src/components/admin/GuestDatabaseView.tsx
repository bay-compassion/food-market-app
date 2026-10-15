import styled from '@emotion/styled';
import { Button, TextField } from '@mui/material';
import useMediaQuery from '@mui/material/useMediaQuery';
import { observer } from 'mobx-react-lite';
import { useMemo, useState } from 'react';

import { adminTranslations } from '../../adminLocales';
import { GuestDatabaseRows } from '../../models/guest-database-rows';
import {
	guestDatabaseFilters,
	type GuestDatabaseFilter,
} from '../../services/guest-database-filters';
import type { ManualAdmission } from '../../services/guestAdmission';
import type { VisitCommand, VisitStatus } from '../../services/visitStateMachine';
import { useRootStore } from '../../stores/react/store-context';
import { useManualGuestForm } from './AddGuestSection';
import { wideLayoutQuery } from './admin-layout';
import { ChoiceChips } from './ChoiceChips';
import { GuestDatabaseGrid } from './GuestDatabaseGrid';
import { GuestDatabaseList } from './GuestDatabaseList';
import { ManualGuestDialog } from './ManualGuestDialog';
import type { ManualGuest, QueueGuest } from './types';

export type GuestDatabaseViewProps = {
	statusLabels: Record<VisitStatus, string>;
	admissions: ManualAdmission[];
	onRun: (guest: QueueGuest, command: VisitCommand) => void;
	onAddGuest: (guest: ManualGuest) => void;
};

const Section = styled.section`
	display: grid;
	gap: 14px;

	.guest-search {
		display: flex;
		gap: 10px;
		align-items: center;
	}

	.guest-search .MuiTextField-root {
		flex: 1;
		min-width: 0;
		max-width: 420px;
	}

	.guest-search .MuiButton-root {
		flex-shrink: 0;
		margin-inline-start: auto;
	}

	/* The grid draws its own frame; this gives it the card edge the other admin screens have. */
	.guest-grid {
		overflow: hidden;
		border: 1.5px solid #c7d2cc;
		border-radius: var(--radius-lg);
	}
`;

/**
 * Every guest on record. Search and the quick filters sit above the list and serve both of its
 * forms: on a desk the full grid, which keeps sorting, the filter panel, the column picker and
 * export; on a phone, a list of rows, since a grid shows a column and a half at that width.
 */
export const GuestDatabaseView = observer(function GuestDatabaseView({
	statusLabels,
	admissions,
	onRun,
	onAddGuest,
}: GuestDatabaseViewProps) {
	const t = adminTranslations.en;
	const { admin } = useRootStore();
	const isWide = useMediaQuery(wideLayoutQuery);
	const [filter, setFilter] = useState<GuestDatabaseFilter>('all');
	const [search, setSearch] = useState('');
	const rows = useMemo(
		() => new GuestDatabaseRows(admin.guests, statusLabels, t.noVisit),
		[admin.guests, statusLabels, t.noVisit],
	);
	const shown = useMemo(() => rows.matching(filter, search), [rows, filter, search]);
	// Composed here rather than through `AddGuestSection` so the button sits beside the search,
	// where a worker meets it before scrolling the list.
	const addGuestForm = useManualGuestForm(admissions);

	function addGuest(guest: ManualGuest) {
		addGuestForm.close();
		onAddGuest(guest);
	}

	return (
		<Section className="admin-section guest-database">
			<div className="guest-search">
				<TextField
					type="search"
					placeholder={t.searchGuestsPlaceholder}
					value={search}
					onChange={(event) => setSearch(event.target.value)}
					slotProps={{ htmlInput: { 'aria-label': t.searchGuests } }}
				/>
				{addGuestForm.canAdd ? (
					<Button type="button" onClick={addGuestForm.open}>
						{t.addGuest}
					</Button>
				) : null}
			</div>
			<ChoiceChips
				label={t.guestFilterLabel}
				options={guestDatabaseFilters.map((value) => ({ value, label: t.guestFilters[value] }))}
				value={filter}
				onChange={setFilter}
			/>
			{isWide ? (
				<div className="guest-grid">
					<GuestDatabaseGrid
						rows={rows}
						shown={shown}
						canExport={admin.can('export:guest-data')}
						busy={admin.isBusy}
						onRun={onRun}
					/>
				</div>
			) : (
				<GuestDatabaseList rows={shown} busy={admin.isBusy} onRun={onRun} />
			)}
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
