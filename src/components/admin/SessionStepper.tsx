import styled from '@emotion/styled';
import { Step, StepContent, StepLabel, Stepper } from '@mui/material';
import { observer } from 'mobx-react-lite';
import { useState, type ReactNode } from 'react';

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

type Phase = keyof typeof phaseLabels;
const phases = Object.keys(phaseLabels) as Phase[];

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

/**
 * The finished steps folded into one line, so the step a worker can act on sits near the top of the
 * screen rather than under a list of things that already happened.
 */
const DoneSummary = styled.button`
	display: flex;
	width: 100%;
	min-height: 56px;
	align-items: center;
	gap: 12px;
	margin-bottom: 16px;
	padding: 10px 14px;
	border: 1.5px solid #c7d2cc;
	border-radius: var(--radius-md);
	color: var(--color-text);
	background: var(--color-background);
	font: inherit;
	text-align: start;
	cursor: pointer;

	.done-mark {
		display: grid;
		flex-shrink: 0;
		width: 26px;
		height: 26px;
		place-items: center;
		border-radius: 50%;
		background: var(--color-brand);
		color: var(--color-on-brand);
	}

	.done-text {
		display: grid;
		flex: 1;
		gap: 2px;
		min-width: 0;
	}

	.done-text span {
		color: var(--color-text-subtle);
		font-size: 14px;
	}

	.done-toggle {
		color: var(--color-brand);
		font-size: 14px;
		font-weight: 700;
		white-space: nowrap;
	}
`;

type SessionStepperProps = {
	sessionState: CurrentSessionState;
	children: ReactNode;
	event: AdminMarketEvent | null;
};

/**
 * Progress follows the server's phase; only the current phase exposes controls. Finished phases
 * fold into a summary line until the worker asks to see the whole timeline.
 */
export const SessionStepper = observer(function SessionStepper({
	sessionState,
	children,
	event,
}: SessionStepperProps) {
	const { translations } = useRootStore();
	const [expanded, setExpanded] = useState(false);

	if (sessionState === 'inactive') {
		return children;
	}

	const activeStep = phases.indexOf(sessionState);
	const doneCount = activeStep;
	const shown = expanded ? phases : phases.slice(activeStep);

	function label(phase: Phase, index: number) {
		const done = index < activeStep;

		if (event && phase === 'scheduled') {
			const time = new Intl.DateTimeFormat(translations.locale, {
				dateStyle: 'medium',
				timeStyle: 'short',
			}).format(new Date(event.registrationOpensAt));

			return `${done ? t.registrationScheduledPast : t.scheduledFor} ${time}`;
		}

		if (event && phase === 'registration_open') {
			const time = new Intl.DateTimeFormat(translations.locale, { timeStyle: 'short' }).format(
				new Date(event.registrationClosesAt),
			);

			return `${done ? t.registrationOpenPast : t.registrationOpenUntil} ${time}`;
		}

		return phaseLabels[phase];
	}

	return (
		<>
			{doneCount > 0 ? (
				<DoneSummary type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
					<span className="done-mark" aria-hidden="true">
						<svg width="15" height="15" viewBox="0 0 24 24">
							<path
								d="M5 12.5l4.5 4.5L19 7.5"
								fill="none"
								stroke="currentColor"
								strokeWidth="3"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
					</span>
					<span className="done-text">
						<strong>
							{doneCount === 1 ? t.stepsDoneOne : t.stepsDone.replace('{count}', String(doneCount))}
						</strong>
						<span>{label(phases[activeStep - 1]!, activeStep - 1)}</span>
					</span>
					<span className="done-toggle">{expanded ? t.hideTimeline : t.showTimeline}</span>
				</DoneSummary>
			) : null}
			<PhaseStepper
				activeStep={activeStep}
				orientation="vertical"
				role="group"
				aria-label={t.currentSession}
			>
				{shown.map((phase) => {
					const index = phases.indexOf(phase);

					return (
						<Step
							key={phase}
							index={index}
							last={index === phases.length - 1}
							completed={index < activeStep}
							aria-current={phase === sessionState ? 'step' : undefined}
						>
							<StepLabel>{label(phase, index)}</StepLabel>
							<StepContent>{phase === sessionState ? children : null}</StepContent>
						</Step>
					);
				})}
			</PhaseStepper>
		</>
	);
});
