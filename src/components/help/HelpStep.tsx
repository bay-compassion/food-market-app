import styled from '@emotion/styled';

import type { HelpStepTranslations } from '../../locales';

/**
 * The number is the list's own counter rather than a prop, so it can never disagree with the
 * step's place in the list — and Persian, which writes its own digits, gets them from CSS.
 */
const Item = styled.li`
	counter-increment: help-step;
	display: grid;
	grid-template-columns: 40px minmax(0, 1fr);
	column-gap: 14px;
	align-items: start;

	&::before {
		content: counter(help-step);
		display: grid;
		place-items: center;
		width: 40px;
		height: 40px;
		border-radius: var(--radius-pill);
		color: var(--color-on-brand);
		background: var(--color-brand);
		font-family: var(--font-heading);
		font-size: 21px;
		font-weight: 700;
	}

	&:lang(fa)::before {
		content: counter(help-step, persian);
	}
`;

const Text = styled.div`
	display: grid;
	gap: 4px;
`;

const Time = styled.span`
	color: var(--color-text-muted);
	font-size: 14px;
	font-weight: 700;
`;

const Title = styled.h3`
	margin: 0;
	font-size: 19px;
	line-height: 1.25;
`;

const Body = styled.p`
	color: var(--color-text-muted);
	line-height: 1.55;
`;

/** One numbered step of the help page: an optional time, what to do, and what to expect. */
export function HelpStep({ time, title, body }: HelpStepTranslations) {
	return (
		<Item>
			<Text>
				{time ? <Time>{time}</Time> : null}
				<Title>{title}</Title>
				<Body>{body}</Body>
			</Text>
		</Item>
	);
}
