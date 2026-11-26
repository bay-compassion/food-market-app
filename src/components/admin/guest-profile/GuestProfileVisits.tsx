import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';

import { adminTranslations } from '../../../adminLocales';
import type { GuestProfile } from '../../../models/guest-profile';
import { useRootStore } from '../../../stores/react/store-context';
import { VisitTimeline } from '../../queue/VisitTimeline';
import { VisitSummary } from './VisitSummary';

const List = styled.ol`
	display: grid;
	gap: 10px;
	margin: 0;
	padding: 0;
	list-style: none;

	li {
		display: grid;
		border: 1.5px solid var(--color-border-soft);
		border-radius: var(--radius-md);
		background: var(--color-surface);
	}

	li[data-open='true'] {
		border-color: var(--color-brand);
	}

	.toggle {
		display: flex;
		align-items: center;
		gap: 8px;
		min-height: 64px;
		padding: 10px 12px 10px 16px;
		border: 0;
		background: transparent;
		color: inherit;
		font: inherit;
		text-align: start;
		cursor: pointer;
	}

	.toggle svg {
		flex-shrink: 0;
		color: var(--color-text-subtle);
		transition: transform 120ms;
	}

	li[data-open='true'] .toggle svg {
		transform: rotate(180deg);
	}

	.history {
		padding: 0 12px 12px;
	}

	.loading,
	.empty {
		margin: 0;
		color: var(--color-text-subtle);
		font-size: 14px;
	}
`;

/**
 * The Visits tab: every visit the guest has had, newest first. Opening one shows what happened to
 * it — each change, who made it, and when — from the same history the queue's ticket shows.
 */
export const GuestProfileVisits = observer(function GuestProfileVisits({
	profile,
}: {
	profile: GuestProfile;
}) {
	const t = adminTranslations.en.guestProfile;
	const store = useRootStore().admin.guestProfile;

	if (profile.visitCount === 0) {
		return <p className="empty">{t.noVisitsYet}</p>;
	}

	return (
		<List aria-label={t.visitsTab}>
			{profile.visits.map((visit) => {
				const isOpen = store.openVisitId === visit.id;
				const history = isOpen ? store.openVisitHistory : null;

				return (
					<li key={visit.id} data-open={isOpen}>
						<button
							type="button"
							className="toggle"
							aria-expanded={isOpen}
							aria-controls={`visit-history-${visit.id}`}
							onClick={() => store.toggleVisit(visit.id)}
						>
							<VisitSummary visit={visit} />
							<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
								<path
									d="M7 10l5 5 5-5"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
								/>
							</svg>
						</button>
						{isOpen ? (
							<div className="history" id={`visit-history-${visit.id}`}>
								{history === null ? (
									<p className="loading" role="status">
										{t.historyLoading}
									</p>
								) : (
									<VisitTimeline events={history} />
								)}
							</div>
						) : null}
					</li>
				);
			})}
		</List>
	);
});
