import styled from '@emotion/styled';
import type { ButtonHTMLAttributes } from 'react';

export type AppButtonVariant = 'primary' | 'secondary';

export type AppButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
	label: string;
	variant?: AppButtonVariant;
	/**
	 * A decorative glyph after the label, such as the arrow on the registration form's submit
	 * button. Hidden from assistive technology — the label is what carries the meaning.
	 */
	trailing?: string;
};

const Button = styled.button<{ $variant: AppButtonVariant }>`
	display: flex;
	justify-content: center;
	align-items: center;
	gap: 13px;
	border: 0;
	border-radius: var(--radius-pill);
	font-family: var(--font-heading);
	font-weight: 700;
	letter-spacing: 0.02em;
	text-transform: uppercase;
	transition:
		transform 0.2s,
		background 0.2s;

	&:disabled {
		cursor: wait;
		opacity: 0.65;
		transform: none;
	}

	${({ $variant }) =>
		$variant === 'primary'
			? `
	min-height: 60px;
	gap: 12px;
	color: var(--color-on-brand);
	background: var(--color-brand);
	font-size: 16.5px;

	&:hover:not(:disabled) {
		background: var(--color-brand-dark);
		transform: translateY(-1px);
	}
`
			: `
	min-width: 170px;
	min-height: 54px;
	padding: 0 24px;
	color: var(--color-brand);
	background: var(--color-background);
	font-size: 15px;
	box-shadow: inset 0 0 0 1.5px var(--color-brand);

	&:hover {
		color: var(--color-on-brand);
		background: var(--color-brand);
		transform: translateY(-1px);
	}
`}
`;

/**
 * The app's button.
 *
 * It takes its text as a `label` rather than as children, which is what lets a Vue parent still
 * render it during the migration: a React island cannot receive Vue-owned slot content. Once no
 * Vue component renders this, `label` can become children again.
 */
export function AppButton({ label, variant = 'primary', trailing, ...rest }: AppButtonProps) {
	return (
		<Button className={`app-button ${variant}`} $variant={variant} {...rest}>
			{label}
			{trailing ? <span aria-hidden="true">{trailing}</span> : null}
		</Button>
	);
}
