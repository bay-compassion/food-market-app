import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';
import { useRef } from 'react';

import { SaturdayProgress, type SaturdayStepState } from '../../models/saturday-progress';
import { useRootStore } from '../../stores/react/store-context';
import { useTranslation } from '../../stores/react/use-translation';
import { useNow } from '../hooks/use-now';
import { SaturdayTimeIndicator } from './SaturdayTimeIndicator';
import { SaturdayTimelineStep } from './SaturdayTimelineStep';

const Header = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	flex-wrap: wrap;
	gap: 8px;
	margin-bottom: 12px;
`;

const Heading = styled.h3`
	margin: 0;
	font-family: var(--font-heading);
	font-size: 20px;
	font-weight: 700;
`;

const ClockLabel = styled.span`
	color: var(--color-brand);
	font-size: 12px;
	font-weight: 700;
	font-variant-numeric: tabular-nums;
`;

const Steps = styled.ol`
	position: relative;
	display: grid;
	margin: 0;
	padding: 0;
	list-style: none;
`;

const Timeline = styled.div`
	position: relative;
`;

export type GuestSaturdayTimelineProps = {
	/** A guest's progress; without it, the timeline explains the usual Saturday. */
	progress?: SaturdayProgress | null;
	/** A fixed instant for previews; the app uses the live clock. */
	time?: number;
};

/** The guest's visit result and the clock are independent: time cannot award a number. */
export const GuestSaturdayTimeline = observer(function GuestSaturdayTimeline({
	progress = null,
	time,
}: GuestSaturdayTimelineProps) {
	const copy = useTranslation().guestView.notOpenState;
	const { session, translations } = useRootStore();
	const list = useRef<HTMLOListElement>(null);
	const clock = session.saturdayClock;
	const liveNow = useNow(clock && time === undefined ? 10_000 : null);
	const now = time ?? liveNow;
	const position = clock?.positionAt(now) ?? null;
	const marker = progress?.marker === 'now' ? copy.markerNow : copy.markerNext;
	const timeline = progress ?? SaturdayProgress.overview;
	const steps: typeof copy.steps = timeline.shouldTryAgain
		? [...copy.steps, { title: copy.tryAgainNextWeek, body: '' }]
		: copy.steps;

	return (
		<section>
			<Header>
				<Heading>{progress || position ? copy.todayHeading : copy.scheduleHeading}</Heading>
				{position && clock ? (
					<ClockLabel>
						{copy.markerNow}{' '}
						<time dateTime={new Date(now).toISOString()}>
							{clock.labelAt(now, translations.locale)}
						</time>
					</ClockLabel>
				) : null}
			</Header>
			<Timeline>
				<Steps ref={list} data-clock-active={position !== null}>
					{steps.map((step, index) => {
						const stepState = timeline.stateOf(index, session.currentStatus);
						const state: SaturdayStepState | undefined =
							progress || stepState === 'skipped' ? stepState : undefined;

						return (
							// Fixed copy in a fixed order; travel has no time to key it by.
							// oxlint-disable-next-line react/no-array-index-key
							<SaturdayTimelineStep
								key={index}
								step={step}
								state={state}
								marker={timeline.marker && !(position && timeline.marker === 'now') ? marker : null}
								placeholderTime={copy.steps[index - 1]?.time}
							/>
						);
					})}
				</Steps>
				{position ? <SaturdayTimeIndicator list={list} position={position} /> : null}
			</Timeline>
		</section>
	);
});
