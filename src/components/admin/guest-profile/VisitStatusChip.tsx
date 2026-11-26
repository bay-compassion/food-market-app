import styled from '@emotion/styled';

import type { VisitStatus } from '../../../services/visitStateMachine';
import { adminVisitStatusLabels } from '../../../services/visitStatusLabels';

const Chip = styled.span`
	flex-shrink: 0;
	padding: 3px 10px;
	border-radius: var(--radius-pill);
	background: var(--color-surface-soft);
	color: var(--color-brand-dark);
	font-size: 12px;
	font-weight: 700;
	white-space: nowrap;

	&[data-tone='served'] {
		background: var(--color-success-surface);
		color: var(--color-success);
	}

	&[data-tone='missed'] {
		background: var(--color-warning-surface);
		color: var(--color-warning);
	}
`;

/** How a visit ended, at a glance: served, missed (no-show, cancelled, not placed), or still open. */
const tones: Record<VisitStatus, 'served' | 'missed' | 'open'> = {
	registered: 'open',
	waiting: 'open',
	called: 'open',
	served: 'served',
	not_placed: 'missed',
	no_show: 'missed',
	cancelled: 'missed',
};

/** A visit's status as a coloured pill. */
export function VisitStatusChip({ status }: { status: VisitStatus }) {
	return <Chip data-tone={tones[status]}>{adminVisitStatusLabels('en')[status]}</Chip>;
}
