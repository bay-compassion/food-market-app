import styled from '@emotion/styled';

export type EyebrowTone = 'on-brand' | 'brand';

export type EyebrowLabelProps = {
	label: string;
	tone?: EyebrowTone;
};

const Eyebrow = styled.p<{ $tone: EyebrowTone }>`
	display: flex;
	align-items: center;
	gap: 9px;
	margin: 0 0 16px;
	font-family: var(--font-heading);
	font-size: 13.5px;
	font-weight: 600;
	letter-spacing: 0.1em;
	text-transform: uppercase;
	color: ${({ $tone }) => ($tone === 'brand' ? 'var(--color-brand)' : 'var(--color-on-brand)')};
`;

/** The short rule that precedes the label, drawn in the current text colour. */
const Rule = styled.span`
	display: block;
	width: 22px;
	height: 2px;
	border-radius: 1px;
	background: currentColor;
`;

/**
 * The small capitalised label above a heading.
 *
 * Takes its text as a `label` rather than as children so a Vue parent can still render it while
 * the migration is in progress — an island cannot receive Vue-owned slot content.
 */
export function EyebrowLabel({ label, tone = 'on-brand' }: EyebrowLabelProps) {
	return (
		<Eyebrow className={`eyebrow ${tone}`} $tone={tone}>
			<Rule />
			{label}
		</Eyebrow>
	);
}
