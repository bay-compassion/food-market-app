import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';

import { adminTranslations } from '../../adminLocales';
import type { VisitStatus } from '../../services/visitStateMachine';

type SessionOverviewProps = {
	statuses: VisitStatus[];
	counts: Partial<Record<VisitStatus, number>>;
	statusLabels: Record<VisitStatus, string>;
};

const StatGrid = styled.div`
	display: grid;
	grid-template-columns: repeat(2, 1fr);
	gap: 10px;
	margin-top: 14px;

	.stat-card {
		display: grid;
		gap: 2px;
		min-height: 92px;
		padding: 15px;
		border-radius: var(--radius-md);
		color: white;
		background: var(--color-brand);
	}

	.stat-card:first-of-type {
		grid-column: span 2;
	}

	.stat-card strong {
		font-family: var(--font-heading);
		font-size: 32px;
	}

	.stat-card span {
		font-size: 13px;
	}

	@media (min-width: 560px) {
		grid-template-columns: repeat(5, 1fr);

		.stat-card:first-of-type {
			grid-column: auto;
		}
	}
`;

export const SessionOverview = observer(function SessionOverview({
	statuses,
	counts,
	statusLabels,
}: SessionOverviewProps) {
	const t = adminTranslations.en;

	return (
		<section className="admin-section">
			<h2>{t.overview}</h2>
			<StatGrid className="stat-grid">
				{statuses.map((status) => (
					<article key={status} className="stat-card">
						<strong>{counts[status] ?? 0}</strong>
						<span>{statusLabels[status]}</span>
					</article>
				))}
			</StatGrid>
		</section>
	);
});
