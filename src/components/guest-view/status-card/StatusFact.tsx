import styled from '@emotion/styled';

const Fact = styled.div<{ $compact: boolean }>`
	display: grid;
	gap: 2px;

	strong {
		display: block;
		color: var(--status-strong, var(--color-brand-dark));
		font-family: var(--font-heading);
		font-size: ${({ $compact }) => ($compact ? '24px' : '30px')};
		font-weight: 700;
		line-height: 1.1;
	}
`;

const Label = styled.p`
	color: var(--color-text-muted);
	font-weight: 500;
`;

const Note = styled.p<{ $compact: boolean }>`
	color: var(--color-text);
	font-size: ${({ $compact }) => ($compact ? '16px' : '17px')};
	line-height: 1.4;
`;

export type StatusFactProps = {
	label: string;
	value: string;
	note?: string;
	/** Smaller, for a fact set in an inset beneath the card's own headline. */
	compact?: boolean;
};

/** A labelled fact read at a glance: "Next Registration / Saturday, October 31 / Opens in 2 days…". */
export function StatusFact({ label, value, note, compact = false }: StatusFactProps) {
	return (
		<Fact $compact={compact}>
			<Label>{label}</Label>
			<p>
				<strong>{value}</strong>
			</p>
			{note ? <Note $compact={compact}>{note}</Note> : null}
		</Fact>
	);
}
