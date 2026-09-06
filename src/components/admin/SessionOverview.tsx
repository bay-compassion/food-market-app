import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';

import { adminTranslations } from '../../adminLocales';
import { SessionProgress, type PipelineStatus } from '../../services/session-progress';
import type { VisitStatus } from '../../services/visitStateMachine';

type SessionOverviewProps = {
	counts: Partial<Record<VisitStatus, number>>;
	statusLabels: Record<VisitStatus, string>;
};

/**
 * The bar's ramp, darkest for the guests service has finished with.
 *
 * One hue stepped down from `--color-brand` rather than four unrelated colors: these are stages of
 * a single pipeline, and reading them in order is what the bar is for. They live here rather than
 * in `base.css` because this is the only figure in the app that draws them.
 */
const segmentColors: Record<PipelineStatus, string> = {
	served: '#023940',
	called: '#34767b',
	waiting: '#9dbfbf',
	no_show: '#c3ccc7',
};

const Overview = styled.section`
	.progress-card {
		margin-top: 14px;
	}

	.progress-headline {
		display: flex;
		align-items: baseline;
		gap: 8px;
	}

	.progress-headline strong {
		font-family: var(--font-heading);
		font-size: 44px;
		line-height: 1;
		color: var(--color-brand);
	}

	.progress-headline span {
		font-size: 18px;
		font-weight: 500;
	}

	.progress-total {
		margin-top: 6px;
		font-size: 13px;
		color: var(--color-text-subtle);
	}

	/* No gap between the segments: they are one length divided up, not four separate bars. */
	.progress-bar {
		display: flex;
		height: 14px;
		margin-top: 14px;
		border-radius: var(--radius-pill);
		overflow: hidden;
		background: #e4eae7;
	}

	.progress-legend {
		display: flex;
		flex-wrap: wrap;
		gap: 8px 16px;
		margin: 14px 0 0;
		padding: 0;
		list-style: none;
	}

	.progress-legend li {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 13px;
		color: var(--color-text-muted);
	}

	.progress-legend .swatch {
		width: 9px;
		height: 9px;
		border-radius: var(--radius-pill);
	}

	.progress-legend strong {
		color: var(--color-text);
	}

	.progress-outside {
		margin-top: 16px;
		padding-top: 14px;
		border-top: 1px solid #dce3df;
		font-size: 13px;
		line-height: 1.5;
		color: var(--color-text-subtle);
	}
`;

/** How far service has worked through today's guests, and who it is not working through. */
export const SessionOverview = observer(function SessionOverview({
	counts,
	statusLabels,
}: SessionOverviewProps) {
	const t = adminTranslations.en;
	const progress = new SessionProgress(counts);

	return (
		<Overview className="admin-section">
			<h2>{t.overview}</h2>
			<div className="progress-card">
				<p className="progress-headline">
					<strong>{progress.served}</strong>
					<span>{statusLabels.served}</span>
				</p>
				<p className="progress-total">
					{t.placedToday.replace('{count}', String(progress.placed))}
				</p>

				{/* The legend below states every count in text, so the bar itself is decoration. */}
				<div className="progress-bar" aria-hidden="true">
					{progress.segments.map((segment) => (
						<div
							key={segment.status}
							style={{
								width: `${segment.percent}%`,
								background: segmentColors[segment.status],
							}}
						/>
					))}
				</div>

				<ul className="progress-legend">
					{progress.segments.map((segment) => (
						<li key={segment.status}>
							<span className="swatch" style={{ background: segmentColors[segment.status] }} />
							<span>
								{statusLabels[segment.status]} <strong>{segment.count}</strong>
							</span>
						</li>
					))}
				</ul>

				<p className="progress-outside">
					{progress.outsideService
						.map(({ status, count }) => `${statusLabels[status]} ${count}`)
						.join(' · ')}
				</p>
			</div>
		</Overview>
	);
});
