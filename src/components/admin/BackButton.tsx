import styled from '@emotion/styled';

const Button = styled.button`
	justify-self: start;
	display: inline-flex;
	align-items: center;
	gap: 6px;
	min-height: 40px;
	/*
	 * Pulled up and in by the room the 40px tap target leaves around its text, so the text lines up
	 * with where every screen's content starts, under the dashboard's heading.
	 */
	margin-block: -8px -4px;
	margin-inline-start: -8px;
	padding: 0 10px;
	border: 0;
	border-radius: var(--radius-pill);
	color: var(--color-brand);
	background: transparent;
	font: inherit;
	font-weight: 700;
	cursor: pointer;

	&:hover {
		background: var(--color-surface-soft);
	}
`;

/** The way back from a subview to the list it opened from, as a quiet link above it. */
export function BackButton({ label, onClick }: { label: string; onClick: () => void }) {
	return (
		<Button type="button" className="back" onClick={onClick}>
			<span aria-hidden="true">←</span>
			{label}
		</Button>
	);
}
