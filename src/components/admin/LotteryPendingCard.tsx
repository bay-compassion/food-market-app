import { Button } from '@mui/material';
import { observer } from 'mobx-react-lite';

import { adminTranslations } from '../../adminLocales';
import type { SessionCommand } from '../../services/sessionStateMachine';
import { useRootStore } from '../../stores/react/store-context';
import { SessionActionCard } from './SessionActionCard';
import { SessionTransitionTimer } from './SessionTransitionTimer';

export type LotteryPendingCardProps = {
	busy?: boolean;
	/** Runs a confirmed session command — here, the draw. */
	onRun: (action: SessionCommand) => void;
};

const postponementSteps = [5, 10];

/**
 * The lottery, once the registration pool is frozen. A manual draw offers one button. An automatic
 * draw says when it will run, and offers to run it now or push it back a few minutes.
 */
export const LotteryPendingCard = observer(function LotteryPendingCard({
	busy,
	onRun,
}: LotteryPendingCardProps) {
	const t = adminTranslations.en;
	const { admin, session, translations } = useRootStore();
	const drawsAt = session.currentState?.event?.lotteryDrawsAt;

	if (!drawsAt) {
		return (
			<SessionActionCard title={t.lotteryActions} description={t.lotteryPendingHelp}>
				<Button type="button" disabled={busy} onClick={() => onRun('run_lottery')}>
					{t.runLottery}
				</Button>
			</SessionActionCard>
		);
	}

	const time = new Intl.DateTimeFormat(translations.locale, { timeStyle: 'short' }).format(
		new Date(drawsAt),
	);

	return (
		<SessionActionCard
			title={t.lotteryActions}
			description={t.lotteryDrawsAt.replace('{time}', time)}
		>
			<SessionTransitionTimer kind="lottery" />
			<Button type="button" disabled={busy} onClick={() => void admin.pauseLottery()}>
				{t.pauseLottery}
			</Button>
			<Button type="button" disabled={busy} onClick={() => onRun('run_lottery')}>
				{t.runLotteryNow}
			</Button>
			{postponementSteps.map((minutes) => (
				<Button
					key={minutes}
					type="button"
					variant="outlined"
					disabled={busy}
					onClick={() => void admin.postponeLottery(minutes)}
				>
					{t.postponeLotteryBy.replace('{minutes}', String(minutes))}
				</Button>
			))}
		</SessionActionCard>
	);
});
