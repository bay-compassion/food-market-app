import { observer } from 'mobx-react-lite';

import { adminTranslations } from '../../adminLocales';
import { SessionTimeline } from '../../models/session-timeline';
import { useRootStore } from '../../stores/react/store-context';
import { useCountdownTimer } from '../hooks/use-countdown-timer';

export const SessionTransitionTimer = observer(function SessionTransitionTimer({
	kind,
}: {
	kind: 'grace' | 'lottery';
}) {
	const { session } = useRootStore();
	const event = session.currentState?.event;
	const deadline =
		kind === 'lottery'
			? event?.lotteryDrawsAt
			: event &&
				(event.registrationGraceEndsAt ??
					SessionTimeline.graceDeadlineAfter(new Date(event.registrationClosesAt)).toISOString());

	return deadline ? <Countdown deadline={deadline} kind={kind} /> : null;
});

function Countdown({ deadline, kind }: { deadline: string; kind: 'grace' | 'lottery' }) {
	const remaining = useCountdownTimer(new Date(deadline).valueOf());
	const t = adminTranslations.en;
	const seconds = Math.max(0, Math.ceil(remaining / 1000));
	const time = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

	return (
		<p role="timer">
			{remaining <= 0
				? t.transitionDue
				: (kind === 'grace' ? t.graceCountdown : t.lotteryCountdown).replace('{time}', time)}
		</p>
	);
}
