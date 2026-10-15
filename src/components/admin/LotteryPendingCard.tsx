import styled from '@emotion/styled';
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
 * The countdown is the thing to read, so it is set large; running the draw is the one filled
 * button, and the ways to delay it sit under it as quieter outlined ones.
 */
const Controls = styled.div`
	display: grid;
	gap: 12px;

	/* Doubled to outrank the action card's muted paragraph colour. */
	&& [role='timer'] {
		color: var(--color-brand-dark);
		font-size: 22px;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		line-height: 1.2;
	}

	.delay-options {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 8px;
	}

	/* Smaller type than the draw button, but still a full-size touch target. */
	.delay-options > * {
		min-height: 44px;
	}

	.delay-options > :last-child {
		grid-column: 1 / -1;
	}
`;

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
			<Controls>
				<SessionTransitionTimer kind="lottery" />
				<Button type="button" disabled={busy} onClick={() => onRun('run_lottery')}>
					{t.runLotteryNow}
				</Button>
				<div className="delay-options">
					{postponementSteps.map((minutes) => (
						<Button
							key={minutes}
							type="button"
							variant="outlined"
							size="medium"
							disabled={busy}
							onClick={() => void admin.postponeLottery(minutes)}
						>
							{t.postponeLotteryBy.replace('{minutes}', String(minutes))}
						</Button>
					))}
					<Button
						type="button"
						variant="outlined"
						size="medium"
						disabled={busy}
						onClick={() => void admin.pauseLottery()}
					>
						{t.pauseLottery}
					</Button>
				</div>
			</Controls>
		</SessionActionCard>
	);
});
