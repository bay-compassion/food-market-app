import styled from '@emotion/styled';
import { useMediaQuery, useTheme } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { observer } from 'mobx-react-lite';
import { useMemo } from 'react';

import { adminTranslations } from '../../adminLocales';
import type { ScheduleRow, ScheduleRowAction } from '../../models/schedule-row';
import { useScheduleStore } from '../../stores/react/use-schedule-store';
import { scheduleColumns } from './schedule-columns';

const Grid = styled(DataGrid)`
	border: 0;
	color: inherit;
	font-family: inherit;

	.MuiDataGrid-columnHeaderTitle {
		font-weight: 700;
	}

	/* Rows grow to fit, so the pattern's description wraps instead of being cut off. */
	.MuiDataGrid-cell {
		display: flex;
		align-items: center;
		padding-block: 10px;
		line-height: 1.35;
		white-space: normal;
	}

	.schedule-date-cell {
		display: grid;
		gap: 2px;
	}

	.schedule-date-cell small {
		color: var(--color-text-subtle);
	}
` as typeof DataGrid;

export type ScheduleGridProps = {
	onAction: (row: ScheduleRow, action: ScheduleRowAction) => void;
};

/** The recurrence pattern and the unfinished session, narrowed to the calendar's selected date. */
export const ScheduleGrid = observer(function ScheduleGrid({ onAction }: ScheduleGridProps) {
	const t = adminTranslations.en;
	const schedule = useScheduleStore();
	const narrow = useMediaQuery(useTheme().breakpoints.down('sm'));
	const busy = schedule.isBusy;
	const columns = useMemo(
		() => scheduleColumns({ narrow, busy, onAction }),
		[narrow, busy, onAction],
	);
	const selectedRowId = schedule.selectedRowId;

	return (
		<Grid
			aria-label={t.scheduleGridLabel}
			rows={schedule.visibleRows}
			columns={columns}
			getRowHeight={() => 'auto'}
			loading={busy && !schedule.isLoaded}
			autoHeight
			hideFooter
			disableColumnSorting
			disableColumnFilter
			disableColumnMenu
			disableRowSelectionOnClick
			rowSelectionModel={{ type: 'include', ids: new Set(selectedRowId ? [selectedRowId] : []) }}
			columnVisibilityModel={{ registrationLabel: !narrow, lotteryLabel: !narrow }}
			localeText={{
				noRowsLabel: schedule.selectedDate ? t.scheduleNothingOnDate : t.scheduleNoRows,
			}}
		/>
	);
});
