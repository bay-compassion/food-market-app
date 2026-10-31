import styled from '@emotion/styled';
import { Button } from '@mui/material';
import { observer } from 'mobx-react-lite';

import { adminTranslations } from '../../adminLocales';
import { currentSessionState } from '../../services/sessionStateMachine';
import { useRootStore } from '../../stores/react/store-context';
import { ChecklistStep } from './ChecklistStep';

const Status = styled.p`
	&[data-ready='true'] {
		color: var(--color-success);
		font-weight: 700;
	}

	&[data-ready='false'] {
		color: var(--color-error);
		font-weight: 700;
	}
`;

/**
 * Whether there is a session to run. The schedule normally adds the next one on its own when the
 * last one ends, so this is a check rather than a task — until the check fails.
 */
export const MarketSessionStep = observer(function MarketSessionStep({
	number,
	onNavigateSchedule,
}: {
	number: number;
	onNavigateSchedule: () => void;
}) {
	const t = adminTranslations.en.checklist.session;
	const { session } = useRootStore();
	const event = session.currentState?.event ?? null;
	const state = currentSessionState(event?.status);

	const loaded = session.currentState !== null;
	const message =
		!event || state === 'inactive'
			? null
			: state === 'scheduled'
				? t.scheduled
						.replace(
							'{opens}',
							new Intl.DateTimeFormat(undefined, { dateStyle: 'full', timeStyle: 'short' }).format(
								new Date(event.registrationOpensAt),
							),
						)
						.replace('{capacity}', String(event.capacity))
				: t.underway;

	return (
		<ChecklistStep number={number} title={t.title} place={t.place}>
			{/* Until the session has loaded, say nothing: "not known yet" is not "no session". */}
			<Status role="status" data-ready={loaded ? message !== null : undefined}>
				{loaded ? (message ?? t.missing) : null}
			</Status>
			{loaded && message === null ? (
				<Button variant="contained" onClick={onNavigateSchedule}>
					{t.openSchedule}
				</Button>
			) : null}
		</ChecklistStep>
	);
});
