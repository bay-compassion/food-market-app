import styled from '@emotion/styled';

const Button = styled.button`
	display: inline-flex;
	align-items: center;
	gap: 6px;
	padding: 0;
	border: 0;
	color: var(--color-brand);
	background: transparent;
	font-weight: 700;
	font-size: 15px;

	svg {
		width: 18px;
	}
`;

export type BackButtonProps = {
	label: string;
	onClick: () => void;
	className?: string;
};

/** The chevron-and-label control a guest screen uses to return to the one before it. */
export function BackButton({ label, onClick, className }: BackButtonProps) {
	return (
		<Button type="button" className={className} onClick={onClick}>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
				<path d="M15 18l-6-6 6-6" />
			</svg>
			{label}
		</Button>
	);
}
