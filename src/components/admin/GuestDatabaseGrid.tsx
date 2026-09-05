import { Global, css } from '@emotion/react';
import styled from '@emotion/styled';
import { useMediaQuery, useTheme } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { useMemo } from 'react';

import { adminTranslations } from '../../adminLocales';
import { GuestDatabaseRows, type GuestDatabaseRow } from '../../services/guest-database-rows';
import type { VisitCommand, VisitStatus } from '../../services/visitStateMachine';
import { guestDatabaseColumns } from './guest-database-columns';
import type { QueueGuest } from './types';

export type GuestDatabaseGridProps = {
	guests: QueueGuest[];
	statusLabels: Record<VisitStatus, string>;
	/** Whether this worker may take guest names and phone numbers off the screen. */
	canExport: boolean;
	busy?: boolean;
	onRun: (guest: QueueGuest, command: VisitCommand) => void;
};

/*
 * The grid draws its own borders and type; these align it with the cards around it and give a row
 * enough height for the queue's action button, which is taller than a default cell.
 */
const Grid = styled(DataGrid)`
	border: 0;
	color: inherit;
	font-family: inherit;

	.MuiDataGrid-columnHeaderTitle {
		font-weight: 700;
	}

	/*
	 * A cell centres its text with a line height the size of the row. The app's reset gives buttons
	 * \`font: inherit\`, so a button in a cell inherits that too and swells to the full row height —
	 * which turns the queue's pill-shaped action button into a circle. Centring the cell with flex
	 * instead lets the line height go back to normal for everything inside it.
	 */
	.MuiDataGrid-cell {
		display: flex;
		align-items: center;
		line-height: normal;
	}
` as typeof DataGrid;

/*
 * The app's theme closes the notch MUI cuts for a floating label, because every field in this
 * product names itself above the control instead. The grid's own panels do float their labels, so
 * inside them the notch is opened back up and the fields return to MUI's own compact size — the
 * alternative is a label struck through by the outline it is meant to sit in.
 */
const panelStyles = css`
	.MuiDataGrid-panel .MuiOutlinedInput-notchedOutline {
		top: -5px;
	}

	.MuiDataGrid-panel .MuiOutlinedInput-notchedOutline legend {
		display: block;
	}

	.MuiDataGrid-panel .MuiInputBase-input {
		height: auto;
		padding: 8.5px 14px;
	}

	.MuiDataGrid-panel .MuiFormLabel-root {
		margin-bottom: 0;
		color: var(--color-text-subtle);
		font-family: inherit;
		font-size: 14px;
		font-weight: 400;
	}
`;

/**
 * Every guest on record, as a sortable and filterable grid.
 *
 * The whole guest list is already loaded by the time this renders, so searching, sorting, and
 * narrowing all happen here rather than as a round trip: the toolbar's search box matches across
 * every column at once, and the filter panel narrows one column at a time.
 */
export function GuestDatabaseGrid({
	guests,
	statusLabels,
	canExport,
	busy,
	onRun,
}: GuestDatabaseGridProps) {
	const t = adminTranslations.en;
	// Household size and visit status are worth filtering and sorting by, but not worth a column of
	// their own on a screen used to look a guest up — so they start hidden everywhere, and language
	// joins them on a phone, where three columns is the most that fits. The Columns button brings
	// any of them back. Read once, as the grid's initial state, so a worker's own choice then sticks.
	const narrow = useMediaQuery(useTheme().breakpoints.down('sm'));
	const rows = useMemo(() => new GuestDatabaseRows(guests, statusLabels), [guests, statusLabels]);
	const columns = useMemo(
		() =>
			guestDatabaseColumns({
				rows,
				busy,
				onRun: (row: GuestDatabaseRow, command) => onRun(row.guest, command),
			}),
		[rows, busy, onRun],
	);

	return (
		<>
			<Global styles={panelStyles} />
			<Grid
				showToolbar
				// Named for assistive technology rather than with the `label` prop, which the toolbar
				// would draw a second time under the section's own heading.
				aria-label={t.allGuests}
				rows={rows.rows}
				columns={columns}
				loading={busy}
				rowHeight={56}
				disableRowSelectionOnClick
				pageSizeOptions={[25, 50, 100]}
				initialState={{
					pagination: { paginationModel: { pageSize: 25, page: 0 } },
					sorting: { sortModel: [{ field: 'name', sort: 'asc' }] },
					columns: {
						columnVisibilityModel: {
							householdSize: false,
							statusLabel: false,
							language: !narrow,
						},
					},
				}}
				localeText={{ noRowsLabel: t.noGuests }}
				slotProps={{
					// A command in flight is a moment, not a reload: a bar above the rows rather than an
					// overlay that takes the guest a worker is looking at off the screen.
					loadingOverlay: { variant: 'linear-progress', noRowsVariant: 'skeleton' },
					// This screen only asks for `run:queue`, but its rows carry the names and phone
					// numbers that `export:guest-data` exists to gate. Disabling both export routes
					// takes the whole export menu out of the toolbar for a worker without it.
					toolbar: {
						csvOptions: { disableToolbarButton: !canExport, fileName: 'guests' },
						printOptions: { disableToolbarButton: !canExport },
					},
				}}
				sx={{ '--DataGrid-overlayHeight': '160px' }}
			/>
		</>
	);
}
