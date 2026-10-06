import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';

import { adminTranslations } from '../../adminLocales';
import { usePrintStation } from './print-station-context';

const List = styled.section`
	h2 {
		margin: 0 0 8px;
		font-family: var(--font-heading);
		font-size: 18px;
	}

	ol {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	li {
		display: grid;
		grid-template-columns: 4ch minmax(0, 1fr) auto auto;
		gap: 16px;
		align-items: baseline;
		padding: 8px 0;
		border-top: 1px solid var(--color-border);
		font-size: 16px;
	}

	.position {
		color: var(--color-brand);
		font-weight: 700;
	}

	.language,
	time {
		color: var(--color-text-subtle);
		font-size: 14px;
		font-variant-numeric: tabular-nums;
	}

	.empty {
		margin: 0;
		color: var(--color-text-subtle);
	}
`;

const timeFormat = new Intl.DateTimeFormat('en-US', {
	hour: 'numeric',
	minute: '2-digit',
	second: '2-digit',
});

/** The tags this station printed most recently, newest first, so a volunteer can tell it's working. */
export const PrintStationLog = observer(function PrintStationLog() {
	const t = adminTranslations.en.queueDesk.printStation;
	const { recent } = usePrintStation();

	return (
		<List aria-label={t.recent}>
			<h2>{t.recent}</h2>
			{recent.length ? (
				<ol>
					{recent.map(({ job, printedAt }) => (
						<li key={job.id}>
							<span className="position">{job.queuePosition ?? '—'}</span>
							<span>
								{job.firstName} {job.lastInitial ? `${job.lastInitial}.` : ''}
							</span>
							<span className="language">{job.locale.toUpperCase()}</span>
							<time dateTime={new Date(printedAt).toISOString()}>
								{timeFormat.format(printedAt)}
							</time>
						</li>
					))}
				</ol>
			) : (
				<p className="empty">{t.noneYet}</p>
			)}
		</List>
	);
});
