import styled from '@emotion/styled';
import { Button } from '@mui/material';
import { observer } from 'mobx-react-lite';

import { adminTranslations } from '../../adminLocales';
import { currentSessionState, type SessionCommand } from '../../services/sessionStateMachine';
import { useRootStore } from '../../stores/react/store-context';
import { CapacityOverrideForm } from './CapacityOverrideForm';
import { MinuteChoices } from './MinuteChoices';

/** Headed like everything else on the screen, rather than in `.admin-section`'s uppercase. */
const Plan = styled.section`
	display: grid;
	gap: 10px;
	padding-top: 14px;
	border-top: 1px solid var(--color-divider);

	& + & {
		margin-top: 16px;
	}

	h2,
	p {
		margin: 0;
	}

	h2 {
		color: var(--color-brand-dark);
		font-family: var(--font-heading);
		font-size: 18px;
		font-weight: 700;
		text-transform: none;
	}

	p {
		color: var(--color-text-muted);
		font-size: 15px;
		line-height: 1.45;
	}

	/* Beats the \`.admin-dashboard form\` layout: the capacity field and its save share a line. */
	&& form {
		display: flex;
		gap: 10px;
		align-items: flex-end;
		margin-top: 0;
	}

	.number-spinner {
		flex: 1;
		min-width: 0;
	}

	form > button {
		min-height: 58px;
	}

	.delays {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 8px;
	}
`;

const postponeChoices = [15, 30, 60];
const extendChoices = [5, 15, 30];
const drawDelayChoices = [5, 10];

export type SessionPhasePlanProps = {
	busy?: boolean;
	onRun: (action: SessionCommand) => void;
};

/**
 * The lower half of the Today screen: the ways to step in. The market carries on without any of
 * them, so they are all outlined, and they sit below what the screen has to say.
 */
export const SessionPhasePlan = observer(function SessionPhasePlan({
	busy,
	onRun,
}: SessionPhasePlanProps) {
	const t = adminTranslations.en;
	const { admin, session } = useRootStore();
	const event = session.currentState?.event;

	const phase = currentSessionState(event?.status);

	if (!event) {
		return null;
	}

	// Closing the day is part of running the queue; everything else here is steering the session.
	if (phase !== 'service_started' && !admin.can('manage:sessions')) {
		return null;
	}

	switch (phase) {
		case 'scheduled':
			return (
				<Plan>
					<h2>{t.today.changeThePlan}</h2>
					<MinuteChoices
						copy={{
							label: t.today.postponeRegistration,
							current: t.today.customPostponeCurrent,
							minutesLabel: t.today.customPostponeMinutes,
							result: t.today.customPostponeResult,
							action: t.today.customPostponeAction,
						}}
						minutes={postponeChoices}
						from={new Date(event.registrationOpensAt)}
						busy={busy}
						onChoose={(minutes) => void admin.postponeRegistration(minutes)}
					/>
					<Button
						type="button"
						variant="outlined"
						disabled={busy}
						onClick={() => onRun('open_registration')}
					>
						{t.openRegistrationNow}
					</Button>
				</Plan>
			);
		case 'registration_open':
			return (
				<Plan>
					<h2>{t.today.changeThePlan}</h2>
					<MinuteChoices
						copy={{
							label: t.today.extendRegistration,
							current: t.today.customExtendCurrent,
							minutesLabel: t.today.customExtendMinutes,
							result: t.today.customExtendResult,
							action: t.today.customExtendAction,
						}}
						minutes={extendChoices}
						from={new Date(event.registrationClosesAt)}
						busy={busy}
						onChoose={(minutes) => void admin.extendRegistration(minutes)}
					/>
					<CapacityOverrideForm
						key={event.id}
						capacity={event.capacity}
						busy={busy}
						onSave={(capacity) =>
							void admin.updateRegistrationOverrides(event.registrationClosesAt, capacity)
						}
					/>
					<Button
						type="button"
						variant="outlined"
						disabled={busy}
						onClick={() => onRun('close_registration')}
					>
						{t.closeRegistration}
					</Button>
				</Plan>
			);
		case 'registration_closed':
			return (
				<Plan>
					<Button
						type="button"
						variant="outlined"
						disabled={busy}
						onClick={() => onRun('reopen_registration')}
					>
						{t.reopenRegistration}
					</Button>
				</Plan>
			);
		case 'lottery_pending':
			// A draw nobody has scheduled has its one button up with the status; nothing to delay.
			return session.milestones?.lotteryDrawsAt ? (
				<>
					<Plan>
						<h2>{t.today.needMoreTime}</h2>
						<div className="delays">
							{drawDelayChoices.map((minutes) => (
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
						</div>
						<Button
							type="button"
							variant="outlined"
							size="medium"
							disabled={busy}
							onClick={() => void admin.pauseLottery()}
						>
							{t.pauseLottery}
						</Button>
					</Plan>
					<Plan>
						<h2>{t.today.everyoneIn}</h2>
						<p>{t.today.runNowHelp}</p>
						<Button
							type="button"
							variant="outlined"
							disabled={busy}
							onClick={() => onRun('run_lottery')}
						>
							{t.runLotteryNow}
						</Button>
					</Plan>
				</>
			) : null;
		case 'service_started':
			return (
				<Plan>
					<h2>{t.today.endOfMarket}</h2>
					<p>{t.today.endOfMarketHelp}</p>
					<Button
						type="button"
						variant="outlined"
						color="error"
						disabled={busy}
						onClick={() => onRun('close_session')}
					>
						{t.closeSession}
					</Button>
				</Plan>
			);
		default:
			return null;
	}
});
