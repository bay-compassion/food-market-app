import type { GridColDef } from '@mui/x-data-grid';

import { adminTranslations } from '../../adminLocales';
import type { QueueGuest } from '../../services/admin-api';
import type { GuestDatabaseRow, GuestDatabaseRows } from '../../services/guest-database-rows';
import type { VisitCommand } from '../../services/visitStateMachine';
import { QueueGuestActions } from './QueueGuestActions';

export type GuestDatabaseColumnOptions = {
	rows: GuestDatabaseRows;
	busy?: boolean;
	onRun: (guest: QueueGuest, command: VisitCommand) => void;
};

/**
 * The guest database's columns.
 *
 * Status and language are `singleSelect` so their filters are a list of the values that exist
 * rather than a free-text box a worker has to spell exactly. The actions column opts out of
 * sorting and filtering — it holds controls, not data — and reuses the queue's own row actions in
 * their menu-only form: this screen is looked things up on rather than run from, so no command
 * earns a button of its own. A guest with no visit has no command to run, but still gets the menu:
 * dialling them, and — for a manager — the QR code that puts them on a phone.
 */
export function guestDatabaseColumns({
	rows,
	busy,
	onRun,
}: GuestDatabaseColumnOptions): GridColDef<GuestDatabaseRow>[] {
	const t = adminTranslations.en;

	return [
		{ field: 'name', headerName: t.guestColumn, flex: 1.4, minWidth: 120 },
		{ field: 'phone', headerName: t.phoneColumn, flex: 1, minWidth: 140 },
		{
			field: 'householdSize',
			headerName: t.householdColumn,
			type: 'number',
			width: 110,
			align: 'left',
			headerAlign: 'left',
		},
		{
			field: 'language',
			headerName: t.languageColumn,
			type: 'singleSelect',
			valueOptions: rows.languageOptions,
			width: 130,
		},
		{
			field: 'statusLabel',
			headerName: t.statusColumn,
			type: 'singleSelect',
			valueOptions: rows.statusOptions,
			width: 110,
		},
		{
			field: 'actions',
			headerName: t.actionsColumn,
			sortable: false,
			filterable: false,
			hideable: false,
			disableColumnMenu: true,
			disableExport: true,
			// One icon button wide, plus enough for the header to spell itself out.
			width: 84,
			align: 'center',
			headerAlign: 'center',
			renderCell: ({ row: { guest } }) => (
				<QueueGuestActions
					guest={guest}
					disabled={busy}
					menuOnly
					// A guest with no visit is offered no command, so this only ever runs against a visit.
					onRun={(command) => guest.status !== null && onRun(guest, command)}
				/>
			),
		},
	];
}
