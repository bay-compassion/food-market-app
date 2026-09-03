import styled from '@emotion/styled';
import { Step, StepContent, StepLabel, Stepper } from '@mui/material';
import type { ReactNode } from 'react';

import { adminTranslations } from '../../adminLocales';
import type { CurrentSessionState, SessionMode } from '../../services/sessionStateMachine';

const t = adminTranslations.en;
const phaseLabels = {
	inactive: t.registrationSettings,
	scheduled: t.scheduled,
	registration_open: t.open,
	registration_closed: t.closed,
	lottery_pending: t.lotteryPending,
	service_started: t.serviceStarted,
} satisfies Record<CurrentSessionState, string>;
const phases = Object.keys(phaseLabels) as CurrentSessionState[];

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
	sessionMode: SessionMode;
	children: ReactNode;
};

/** Progress follows the server's phase; only the current phase exposes controls. */
export function SessionStepper({ sessionState, sessionMode, children }: SessionStepperProps) {
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
					completed={index < activeStep && (phase !== 'scheduled' || sessionMode === 'scheduled')}
					aria-current={phase === sessionState ? 'step' : undefined}
				>
					<StepLabel>{phaseLabels[phase]}</StepLabel>
					<StepContent>{phase === sessionState ? children : null}</StepContent>
				</Step>
			))}
		</PhaseStepper>
	);
}
