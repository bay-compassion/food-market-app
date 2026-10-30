import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';

import { SaturdayProgress, type SaturdayStepState } from '../../models/saturday-progress';
import { useRootStore } from '../../stores/react/store-context';
import { useTranslation } from '../../stores/react/use-translation';

const Heading = styled.h3`
	margin: 0 0 12px;
	font-family: var(--font-heading);
	font-size: 20px;
	font-weight: 700;
`;

const Steps = styled.ol`
	display: grid;
	margin: 0;
	padding: 0;
	list-style: none;
`;

/**
 * Time, rail, then text — the rail's line runs on to the next step, ending at the last one. A step
 * without a time (making your way to the market) leaves its column empty, so the rail stays aligned.
 */
const Step = styled.li`
	display: grid;
	grid-template-columns: max-content 18px 1fr;
	column-gap: 12px;

	&:not(:last-child) > div {
		padding-bottom: 18px;
	}

	&[data-state='past'] > span:first-of-type,
	&[data-state='past'] p:first-of-type,
	&[data-state='skipped'] > span:first-of-type,
	&[data-state='skipped'] p:first-of-type {
		color: var(--color-text-subtle);
	}

	&[data-state='skipped'] > span:first-of-type {
		text-decoration: line-through;
	}
`;

/**
 * Each row sizes its own time column, so a step without a time reserves the width of the one before
 * it, invisibly, to keep its rail in line with the others in any language.
 */
const Time = styled.span<{ $placeholder?: boolean }>`
	min-width: 72px;
	visibility: ${({ $placeholder }) => ($placeholder ? 'hidden' : 'visible')};
	color: var(--color-brand);
	font-weight: 700;
	line-height: 1.4;
`;

/*
 * Taught (no progress), every dot is filled but the last, which the line runs into. Marked off, a
 * step already behind the guest fills in grey, the current one is a ringed hollow, and those still
 * to come are hollow.
 */
const Rail = styled.span`
	display: flex;
	flex-direction: column;
	align-items: center;

	&::before {
		width: 14px;
		height: 14px;
		margin-top: 3px;
		flex-shrink: 0;
		box-sizing: border-box;
		border: 3px solid var(--color-brand);
		border-radius: 50%;
		background: var(--color-brand);
		content: '';
	}

	&::after {
		flex: 1;
		width: 2px;
		background: var(--color-border-soft);
		content: '';
	}

	li:last-child > &::before,
	li[data-state='upcoming'] > &::before,
	li[data-state='skipped'] > &::before {
		background: transparent;
	}

	li[data-state='skipped'] > &::before {
		border-color: var(--color-text-subtle);
	}

	li:last-child > &::after {
		display: none;
	}

	li[data-state='past'] > &::before {
		border-color: var(--color-text-subtle);
		background: var(--color-text-subtle);
	}

	li[data-state='past'] > &::after {
		background: var(--color-text-subtle);
	}

	li[data-state='current'] > &::before {
		width: 18px;
		height: 18px;
		margin-top: 1px;
		border-width: 4px;
		background: var(--color-background);
		box-shadow: 0 0 0 4px var(--color-surface-soft);
	}
`;

const Title = styled.p`
	font-weight: 700;
	line-height: 1.4;
`;

const Marker = styled.span`
	display: inline-block;
	margin-inline-start: 8px;
	padding: 2px 8px;
	border-radius: var(--radius-pill);
	color: var(--color-on-brand);
	background: var(--color-brand);
	font-size: 12px;
	font-weight: 700;
	letter-spacing: 0.04em;
	text-transform: uppercase;
	vertical-align: 2px;
`;

const Body = styled.p`
	margin-top: 2px;
	color: var(--color-text-muted);
	line-height: 1.5;
`;

export type GuestSaturdayTimelineProps = {
	/**
	 * Marks the steps off for a guest with a visit, under "Today". Without it the timeline teaches
	 * how every Saturday runs.
	 */
	progress?: SaturdayProgress | null;
};

/** A market Saturday at a glance: register, the draw, the trip to the market, shopping. */
export const GuestSaturdayTimeline = observer(function GuestSaturdayTimeline({
	progress = null,
}: GuestSaturdayTimelineProps) {
	const copy = useTranslation().guestView.notOpenState;
	const { session } = useRootStore();
	const marker = progress?.marker === 'now' ? copy.markerNow : copy.markerNext;
	const timeline = progress ?? SaturdayProgress.overview;
	const steps: typeof copy.steps = timeline.shouldTryAgain
		? [...copy.steps, { title: copy.tryAgainNextWeek, body: '' }]
		: copy.steps;

	return (
		<section>
			<Heading>{progress ? copy.todayHeading : copy.scheduleHeading}</Heading>
			<Steps>
				{steps.map((step, index) => {
					const stepState = timeline.stateOf(index, session.currentStatus);
					const state: SaturdayStepState | undefined =
						progress || stepState === 'skipped' ? stepState : undefined;

					return (
						// The steps are fixed copy in a fixed order, and one has no time to key it by.
						// oxlint-disable-next-line react/no-array-index-key
						<Step
							key={index}
							data-state={state}
							aria-current={state === 'current' ? 'step' : undefined}
						>
							{step.time ? (
								<Time>{step.time}</Time>
							) : (
								<Time $placeholder aria-hidden="true">
									{copy.steps[index - 1]?.time}
								</Time>
							)}
							<Rail aria-hidden="true" />
							<div>
								<Title>
									{state === 'skipped' ? (
										<>
											<s>{step.title}</s>
											<span className="sr-only"> — {copy.skippedStep}</span>
										</>
									) : (
										step.title
									)}
									{state === 'current' && timeline.marker ? <Marker>{marker}</Marker> : null}
								</Title>
								{/* Completed and inapplicable steps need no instructions. */}
								{step.body && state !== 'past' && state !== 'skipped' ? (
									<Body>{step.body}</Body>
								) : null}
							</div>
						</Step>
					);
				})}
			</Steps>
		</section>
	);
});
