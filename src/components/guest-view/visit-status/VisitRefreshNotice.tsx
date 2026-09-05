import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';
import type { CSSProperties } from 'react';

import { useRootStore } from '../../../stores/react/store-context';
import { useTranslation } from '../../../stores/react/use-translation';
import { useCountdownTimer } from '../../hooks/use-countdown-timer';

const Notice = styled.div`
	display: grid;
	justify-items: center;
	gap: 8px;
	margin-top: 14px;
	text-align: center;
`;

const Track = styled.div`
	width: 120px;
	height: 3px;
	border-radius: 999px;
	background: color-mix(in srgb, var(--color-border) 55%, transparent);
	overflow: hidden;
`;

/**
 * Fills across one refresh cycle. A depleting bar carries "something is coming" without asking the
 * guest to read anything, which is the whole point for a screen people stare at while they wait.
 */
const Fill = styled.div`
	width: calc(var(--visit-refresh-progress) * 100%);
	height: 100%;
	border-radius: inherit;
	background: var(--color-brand);
`;

const Message = styled.p`
	margin: 0;
	color: var(--color-text-muted);
	font-size: 13px;
	line-height: 1.5;

	strong {
		display: block;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		color: var(--color-text);
	}
`;

/**
 * Tells a waiting guest when their queue standing next updates, so reaching for the browser's
 * reload button stops looking like the only way to find out. Rendered only while the visit is
 * actually being refreshed in the background — a finished or cancelled visit has nothing pending.
 */
export const VisitRefreshNotice = observer(function VisitRefreshNotice() {
	const { visit } = useRootStore();
	const nextRefreshAt = visit.nextRefreshAt;

	if (nextRefreshAt === null) {
		return null;
	}

	return <RefreshCountdown nextRefreshAt={nextRefreshAt} intervalMs={visit.refreshIntervalMs} />;
});

/** Mounted only when a refresh is scheduled, which keeps the timer's hooks unconditional. */
function RefreshCountdown({
	nextRefreshAt,
	intervalMs,
}: {
	nextRefreshAt: number;
	intervalMs: number;
}) {
	const t = useTranslation();
	const copy = t.guestView.refreshNotice;
	const remainingMs = useCountdownTimer(nextRefreshAt);
	/**
	 * The refresh runs when the countdown reaches zero and only reschedules once the response is
	 * back, so "overdue" is exactly the window where a request is in flight — or where a phone
	 * throttled the tab's timers while it was in the background.
	 */
	const isUpdating = remainingMs <= 0;
	const progress = Math.min(1, Math.max(0, 1 - remainingMs / intervalMs));

	return (
		<Notice className="visit-refresh-notice">
			<Track
				className="visit-refresh-track"
				style={{ '--visit-refresh-progress': progress } as CSSProperties}
				aria-hidden="true"
			>
				<Fill className="visit-refresh-fill" />
			</Track>
			<Message className="visit-refresh-message">
				{/*
					A countdown that changes every second would make a screen reader unusable if it were
					announced, so the ticking text is hidden and the static sentence below carries the
					same reassurance.
				*/}
				<strong aria-hidden="true">
					{isUpdating
						? copy.updating
						: copy.countdown.replace('{seconds}', String(Math.ceil(remainingMs / 1_000)))}
				</strong>
				<span aria-hidden="true">{copy.noNeedToRefresh}</span>
				<span className="sr-only">{copy.accessibleDescription}</span>
			</Message>
		</Notice>
	);
}
