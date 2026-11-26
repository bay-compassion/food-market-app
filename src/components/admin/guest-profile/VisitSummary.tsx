import styled from '@emotion/styled';

import type { GuestProfileVisit } from '../../../models/guest-profile';
import { formatVisitDate } from '../../../services/visit-date';
import { visitDetail } from './visit-detail';
import { VisitStatusChip } from './VisitStatusChip';

const Line = styled.span`
	display: flex;
	flex: 1;
	align-items: center;
	gap: 12px;
	min-width: 0;

	.when {
		display: grid;
		flex: 1;
		gap: 2px;
		min-width: 0;
	}

	strong {
		font-size: 15px;
	}

	.detail {
		color: var(--color-text-subtle);
		font-size: 13px;
	}
`;

/** One visit in a line: when, what it was, and how it ended. */
export function VisitSummary({ visit }: { visit: GuestProfileVisit }) {
	return (
		<Line>
			<span className="when">
				<strong>{formatVisitDate(visit.visitDate)}</strong>
				<span className="detail">{visitDetail(visit)}</span>
			</span>
			<VisitStatusChip status={visit.status} />
		</Line>
	);
}
