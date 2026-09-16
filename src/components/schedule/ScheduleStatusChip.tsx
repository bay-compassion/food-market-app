import { Chip } from '@mui/material';

import type { ScheduleRowStatus } from '../../models/schedule-row';

const colors = {
	recurring: 'default',
	pending: 'info',
	active: 'success',
} as const satisfies Record<ScheduleRowStatus, string>;

/** A row's status, as a chip coloured by how close the session is to running. */
export function ScheduleStatusChip({
	status,
	label,
}: {
	status: ScheduleRowStatus;
	label: string;
}) {
	return <Chip size="small" label={label} color={colors[status]} variant="outlined" />;
}
