import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';

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

/** Time, rail, then text — the rail's line runs on to the next step, ending at the last one. */
const Step = styled.li`
	display: grid;
	grid-template-columns: max-content 14px 1fr;
	column-gap: 12px;

	&:not(:last-child) > div {
		padding-bottom: 18px;
	}
`;

const Time = styled.span`
	min-width: 72px;
	color: var(--color-brand);
	font-weight: 700;
	line-height: 1.4;
`;

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

	li:last-child > &::before {
		background: transparent;
	}

	li:last-child > &::after {
		display: none;
	}
`;

const Title = styled.p`
	font-weight: 700;
	line-height: 1.4;
`;

const Body = styled.p`
	margin-top: 2px;
	color: var(--color-text-muted);
	line-height: 1.5;
`;

/** A market Saturday at a glance: when to register, when the lottery draws, when shopping starts. */
export const GuestSaturdayTimeline = observer(function GuestSaturdayTimeline() {
	const copy = useTranslation().guestView.notOpenState;

	return (
		<section>
			<Heading>{copy.scheduleHeading}</Heading>
			<Steps>
				{copy.steps.map((step) => (
					<Step key={step.time}>
						<Time>{step.time}</Time>
						<Rail aria-hidden="true" />
						<div>
							<Title>{step.title}</Title>
							<Body>{step.body}</Body>
						</div>
					</Step>
				))}
			</Steps>
		</section>
	);
});
