import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';

import { adminTranslations } from '../../adminLocales';
import type { SessionMilestone } from '../../models/session-milestones';
import { useRootStore } from '../../stores/react/store-context';
import { formatClockTime } from './session-format';

const List = styled.ol`
	display: grid;
	margin: 0;
	padding: 0;
	overflow: hidden;
	border: 1.5px solid var(--color-border-soft);
	border-radius: var(--radius-md);
	list-style: none;

	li {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		padding: 12px 14px;
		color: var(--color-text-muted);
		font-size: 15px;
	}

	li + li {
		border-top: 1px solid var(--color-divider);
	}

	li[data-state='done'] {
		color: var(--color-text-subtle);
	}

	li[data-state='current'] {
		color: var(--color-brand-dark);
		background: var(--color-surface-soft);
		font-weight: 700;
	}

	li[data-state='current'][data-kind='lottery_draw'] {
		color: var(--color-warning);
		background: var(--color-warning-surface);
	}

	.name {
		display: flex;
		gap: 8px;
		align-items: center;
	}

	.when {
		text-align: end;
	}

	svg {
		flex-shrink: 0;
	}
`;

/** Done is a check, where the session stands is a filled dot, and what is still ahead a ring. */
function MilestoneMark({ state }: { state: SessionMilestone['state'] }) {
	return (
		<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
			{state === 'done' ? (
				<path
					d="M5 12.5l4.5 4.5L19 7.5"
					fill="none"
					stroke="var(--color-success)"
					strokeWidth="3"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
			) : state === 'current' ? (
				<circle cx="12" cy="12" r="6" fill="currentColor" />
			) : (
				<circle
					cx="12"
					cy="12"
					r="6"
					fill="none"
					stroke="var(--color-text-subtle)"
					strokeWidth="2"
				/>
			)}
		</svg>
	);
}

/** The whole market day at a glance, on every phase of the Today screen. */
export const SessionMilestoneList = observer(function SessionMilestoneList() {
	const t = adminTranslations.en.today;
	const { admin, session, translations } = useRootStore();

	function name({ kind, state }: SessionMilestone) {
		const started = kind === 'service_starts' && state === 'current';

		return state === 'done' || started ? t.milestones[kind].done : t.milestones[kind].next;
	}

	function when({ kind, state, at }: SessionMilestone) {
		if (at) {
			return formatClockTime(at, translations.locale);
		}

		if (kind === 'lottery_draw') {
			if (state === 'done') {
				return null;
			}

			return admin.can('manage:sessions') ? t.whenYouRunIt : t.whenAdminRunsIt;
		}

		return state === 'current' ? t.now : t.afterTheDraw;
	}

	return (
		<List aria-label={t.timelineLabel}>
			{session.milestones?.list.map((milestone) => (
				<li
					key={milestone.kind}
					data-kind={milestone.kind}
					data-state={milestone.state}
					aria-current={milestone.state === 'current' ? 'step' : undefined}
				>
					<span className="name">
						<MilestoneMark state={milestone.state} />
						{name(milestone)}
					</span>
					<span className="when">{when(milestone)}</span>
				</li>
			))}
		</List>
	);
});
