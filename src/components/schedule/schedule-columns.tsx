import type { GridColDef } from '@mui/x-data-grid';
import { GridActionsCellItem } from '@mui/x-data-grid';

import { adminTranslations } from '../../adminLocales';
import type { ScheduleRow, ScheduleRowAction } from '../../models/schedule-row';
import { ScheduleStatusChip } from './ScheduleStatusChip';

export type ScheduleColumnOptions = {
	/** On a phone the times fold under the date. */
	narrow: boolean;
	busy?: boolean;
	onAction: (row: ScheduleRow, action: ScheduleRowAction) => void;
};

/**
 * The Schedule grid's columns. None sort or filter: the grid holds the pattern and at most one
 * session, in a fixed order, and the calendar is how a worker narrows it. A row's actions sit in its
 * menu, which keeps the column narrow enough for a phone.
 */
export function scheduleColumns({
	narrow,
	busy,
	onAction,
}: ScheduleColumnOptions): GridColDef<ScheduleRow>[] {
	const t = adminTranslations.en;
	const actionLabels: Record<ScheduleRowAction, string> = {
		start_now: t.scheduleStartNow,
		edit: t.scheduleEdit,
		delete: t.scheduleDelete,
		create_next_session: t.scheduleCreateNext,
		go_to_session: t.scheduleGoToSession,
	};

	return [
		{
			field: 'dateLabel',
			headerName: t.scheduleDateColumn,
			flex: 1.6,
			minWidth: 150,
			renderCell: ({ row }) =>
				narrow ? (
					<span className="schedule-date-cell">
						<strong>{row.dateLabel}</strong>
						<small>{row.registrationLabel}</small>
					</span>
				) : (
					row.dateLabel
				),
		},
		{
			field: 'registrationLabel',
			headerName: t.scheduleRegistrationColumn,
			flex: 1,
			minWidth: 150,
		},
		{ field: 'lotteryLabel', headerName: t.scheduleLotteryColumn, flex: 0.8, minWidth: 110 },
		{
			field: 'statusLabel',
			headerName: t.statusColumn,
			width: 110,
			renderCell: ({ row }) => <ScheduleStatusChip status={row.status} label={row.statusLabel} />,
		},
		{
			field: 'actions',
			type: 'actions',
			headerName: t.actionsColumn,
			width: 70,
			getActions: ({ row }) =>
				row.actions.map((action) => (
					<GridActionsCellItem
						key={action}
						label={actionLabels[action]}
						disabled={busy}
						showInMenu
						onClick={() => onAction(row, action)}
					/>
				)),
		},
	];
}
