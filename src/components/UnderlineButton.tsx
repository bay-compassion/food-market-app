import styled from '@emotion/styled';
import type { ComponentPropsWithRef } from 'react';

const Control = styled.button`
	appearance: none;
	display: inline-flex;
	align-items: center;
	min-height: 44px;
	padding: 0;
	border: 0;
	border-radius: 0;
	background: transparent;
	color: var(--color-brand);
	font: inherit;
	text-align: inherit;
	text-decoration: underline;
	text-underline-offset: 0.15em;
	cursor: pointer;

	&:hover:not(:disabled) {
		color: var(--color-brand-dark);
	}

	&:focus-visible {
		outline: 3px solid var(--color-focus);
		outline-offset: 2px;
	}

	&:disabled {
		color: var(--color-text-subtle);
		cursor: not-allowed;
	}
`;

export type UnderlineButtonProps = ComponentPropsWithRef<'button'>;

/** A link-styled action with native button semantics and no ripple or background fill. */
export function UnderlineButton({ type = 'button', ...props }: UnderlineButtonProps) {
	return <Control type={type} {...props} />;
}
