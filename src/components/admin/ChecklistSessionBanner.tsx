import styled from '@emotion/styled';
import { Button } from '@mui/material';
import { observer } from 'mobx-react-lite';

import { adminTranslations } from '../../adminLocales';
import { currentSessionState } from '../../services/sessionStateMachine';
import { useRootStore } from '../../stores/react/store-context';

const Banner = styled.section`
	display: grid;
	gap: 10px;
	padding: 14px 16px;
	border-radius: var(--radius-md);

	&[data-ready='true'] {
		background: var(--color-success-surface);
	}

	&[data-ready='false'] {
		background: var(--color-warning-surface);
	}

	h2,
	p {
		margin: 0;
	}

	h2 {
		font-size: 16px;
	}

	&[data-ready='true'] h2 {
		color: var(--color-success);
	}

	&[data-ready='false'] h2 {
		color: var(--color-warning);
	}

	p {
		color: var(--color-text-muted);
		font-size: 14px;
		line-height: 1.45;
	}

	.button {
		justify-self: start;
	}
`;

/**
 * Whether there is a session to set up for, ahead of everything else, since there is nothing to set
 * up without one and the stations' ticks belong to it. The schedule normally adds the next session
 * on its own when the last one ends, so this is a check rather than a task — until the check fails.
 * Until the session has loaded it says nothing: "not known yet" is not "no session".
 */
export const ChecklistSessionBanner = observer(function ChecklistSessionBanner({
	onNavigateSchedule,
}: {
	onNavigateSchedule: () => void;
}) {
	const t = adminTranslations.en.checklist;
	const { session } = useRootStore();

	if (session.currentState === null) {
		return null;
	}

	const event = session.currentState.event;
	const state = currentSessionState(event?.status);

	if (!event || state === 'inactive') {
		return (
			<Banner role="status" data-ready={false}>
				<h2>{t.session.missingTitle}</h2>
				<p>{t.session.missing}</p>
				<p>{t.ticksNeedSession}</p>
				<Button className="button" variant="contained" onClick={onNavigateSchedule}>
					{t.session.openSchedule}
				</Button>
			</Banner>
		);
	}

	const message =
		state === 'scheduled'
			? t.session.scheduled
					.replace(
						'{opens}',
						new Intl.DateTimeFormat(undefined, { dateStyle: 'full', timeStyle: 'short' }).format(
							new Date(event.registrationOpensAt),
						),
					)
					.replace('{capacity}', String(event.capacity))
			: t.session.underway;

	return (
		<Banner role="status" data-ready={true}>
			<h2>{t.session.scheduledTitle}</h2>
			<p>{message}</p>
		</Banner>
	);
});
