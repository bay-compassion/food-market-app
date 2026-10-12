import styled from '@emotion/styled';

import type { VisitStatusTranslations } from '@/locales.ts';

import type { NowCallingUrgency } from '../../../models/now-calling';

/** One pip per number called past the guest's, up to this many; the sentence carries the rest. */
const pipLimit = 8;

const urgencyColours: Record<Exclude<NowCallingUrgency, 'none'>, string> = {
	recent: 'var(--color-brand)',
	behind: 'var(--color-warning)',
	wellBehind: 'var(--color-error)',
};

const Indicator = styled.div<{ $colour: string }>`
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 8px;
	padding: 0 20px 18px;
	color: ${({ $colour }) => $colour};
`;

const Pips = styled.div`
	display: flex;
	flex-wrap: wrap;
	justify-content: center;
	align-items: center;
	gap: 5px;
`;

const Pip = styled.span`
	width: 10px;
	height: 10px;
	border-radius: var(--radius-pill);
	background: currentColor;
`;

const More = styled.span`
	font-family: var(--font-heading);
	font-weight: 700;
	font-size: 14px;
	line-height: 1;
`;

/* A div, not a p: GuestVisitStatusPanel styles every paragraph inside it as muted body copy. */
const Sentence = styled.div`
	font-size: 15px;
	font-weight: 700;
`;

export type SinceYoursIndicatorProps = {
	copy: VisitStatusTranslations['called'];
	/** How many main numbers have been called past the guest's; nothing shows at zero. */
	numbersSince: number;
	urgency: NowCallingUrgency;
};

/**
 * Under a called guest's "now calling" row: how far the line has moved on since their number, for
 * a guest who is late or taking their time. A pip for each number called since theirs, in a colour
 * that warms from the brand's to amber to red as the count grows — the card grows more pressing
 * without scolding — and the count in words, which is what a screen reader hears.
 */
export function SinceYoursIndicator({ copy, numbersSince, urgency }: SinceYoursIndicatorProps) {
	if (urgency === 'none' || numbersSince === 0) {
		return null;
	}

	const sentence = (numbersSince === 1 ? copy.sinceYoursOne : copy.sinceYoursOther).replace(
		'{count}',
		String(numbersSince),
	);
	const pips = Math.min(numbersSince, pipLimit);

	return (
		<Indicator className="since-yours" data-urgency={urgency} $colour={urgencyColours[urgency]}>
			<Pips aria-hidden="true">
				{Array.from({ length: pips }, (_, index) => (
					<Pip key={index} />
				))}
				{numbersSince > pipLimit ? <More>+{numbersSince - pipLimit}</More> : null}
			</Pips>
			<Sentence>{sentence}</Sentence>
		</Indicator>
	);
}
