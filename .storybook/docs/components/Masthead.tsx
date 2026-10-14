import styled from '@emotion/styled';

import { BrandLockup } from '../../../src/components/BrandLockup';
import type { MastheadProps } from '../types';

/**
 * The guest hero's own treatment (`.hero` in `app-shell.css`): a brand-filled panel with the large
 * radius, white text, and the same translucent white rule the language selector sits under.
 * `print-color-adjust` keeps the fill when a docs page is printed for the review document.
 */
const Band = styled.header`
	margin: 0 0 32px;
	padding: 28px 22px 32px;
	border-radius: var(--radius-lg);
	color: var(--color-on-brand);
	background: var(--color-brand);
	print-color-adjust: exact;
	-webkit-print-color-adjust: exact;
`;

const Wordmark = styled(BrandLockup)`
	--brand-lockup-size: 24px;
	margin: 0 0 24px;
`;

/**
 * The rule and the space under it belong to this wrapper, not the heading: Storybook's docs styles
 * reset an `h1`'s padding with a more specific selector than an Emotion class, which left the
 * title pressed against the rule.
 */
const Title = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16px;
	padding-top: 24px;
	border-top: 2px solid rgba(255, 255, 255, 0.4);
`;

const Heading = styled.h1`
	flex: 1 1 auto;
	min-width: min-content;
	margin: 0;
	padding: 0;
	border: 0;
	color: var(--color-on-brand);
	font-family: var(--font-heading);
	font-size: 34px;
	font-weight: 700;
	line-height: 1.05;
	letter-spacing: -0.01em;
	text-transform: uppercase;
`;

const Subtitle = styled.p`
	flex: 0 1 auto;
	max-width: 45%;
	margin: 0;
	text-align: end;
	color: var(--color-on-brand);
	font-family: var(--font-heading);
	font-size: 13.5px;
	font-weight: 600;
	letter-spacing: 0.1em;
	text-transform: uppercase;
`;

/** The title block at the top of a docs page, in the organization's colours and type. */
export function Masthead({ title, subtitle }: MastheadProps) {
	return (
		<Band>
			<Wordmark />
			<Title>
				<Heading>{title}</Heading>
				{subtitle ? <Subtitle>{subtitle}</Subtitle> : null}
			</Title>
		</Band>
	);
}
