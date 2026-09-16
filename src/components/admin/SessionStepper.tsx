import styled from '@emotion/styled';
import { Step, StepContent, StepLabel, Stepper } from '@mui/material';
import { observer } from 'mobx-react-lite';
import type { ReactNode } from 'react';

import { adminTranslations } from '../../adminLocales';
import type { CurrentSessionState } from '../../services/sessionStateMachine';
import { useRootStore } from '../../stores/react/store-context';
import type { AdminMarketEvent } from './types';

const t = adminTranslations.en;
const phaseLabels = {
	scheduled: t.scheduled,
	registration_open: t.open,
	registration_closed: t.closed,
	lottery_pending: t.lotteryPending,
	service_started: t.serviceStarted,
} satisfies Record<Exclude<CurrentSessionState, 'inactive'>, string>;
const phases = Object.keys(phaseLabels) as (keyof typeof phaseLabels)[];

const PhaseStepper = styled(Stepper)`
	margin-bottom: 24px;

	.MuiStepContent-root {
		padding-right: 0;
	}

	.MuiStepContent-root .admin-section {
		margin-bottom: 0;
		padding: 12px 0;
		border: 0;
	}

	.MuiStepContent-root .action-card {
		flex-direction: column;
	}
`;

type SessionStepperProps = {
	sessionState: CurrentSessionState;
	children: ReactNode;
	event: AdminMarketEvent | null;
};

/** Progress follows the server's phase; only the current phase exposes controls. */
export const SessionStepper = observer(function SessionStepper({
	sessionState,
	children,
	event,
}: SessionStepperProps) {
	const { translations } = useRootStore();

	if (sessionState === 'inactive') {
		return children;
	}

	const activeStep = phases.indexOf(sessionState);

	return (
		<PhaseStepper
			activeStep={activeStep}
			orientation="vertical"
			role="group"
			aria-label={t.currentSession}
		>
			{phases.map((phase, index) => (
				<Step
					key={phase}
					completed={index < activeStep}
					aria-current={phase === sessionState ? 'step' : undefined}
				>
					<StepLabel>
						{event && phase === 'scheduled'
							? `${index < activeStep ? t.registrationScheduledPast : t.scheduledFor} ${new Intl.DateTimeFormat(translations.locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(event.registrationOpensAt))}`
							: event && phase === 'registration_open'
								? `${index < activeStep ? t.registrationOpenPast : t.registrationOpenUntil} ${new Intl.DateTimeFormat(translations.locale, { timeStyle: 'short' }).format(new Date(event.registrationClosesAt))}`
								: phaseLabels[phase]}
					</StepLabel>
					<StepContent>{phase === sessionState ? children : null}</StepContent>
				</Step>
			))}
		</PhaseStepper>
	);
});
