import styled from '@emotion/styled';
import type { ReactNode } from 'react';

export type GuestStateMessageProps = {
	heading: string;
	description: string;
	icon?: string;
	/** Rendered between the heading and the description — schedule details, typically. */
	details?: ReactNode;
	children?: ReactNode;
	className?: string;
};

const Message = styled.div`
	display: grid;
	min-height: 280px;
	place-content: center;
	text-align: center;

	h2 {
		margin-bottom: 8px;
		font-family: var(--font-heading);
		font-size: 28px;
		text-transform: uppercase;
	}

	p {
		max-width: var(--state-description-max-width, 320px);
		color: var(--color-text-muted);
		line-height: 1.55;
	}
`;

const Icon = styled.div`
	display: grid;
	width: 54px;
	height: 54px;
	place-self: center;
	place-items: center;
	margin-bottom: 16px;
	border-radius: 50%;
	color: white;
	background: var(--color-brand);
	font-size: 28px;
`;

/** The shared shape of every "nothing to do right now" screen: icon, heading, explanation. */
export function GuestStateMessage({
	heading,
	description,
	icon = '—',
	details,
	children,
	className,
}: GuestStateMessageProps) {
	return (
		<Message className={`state-message${className ? ` ${className}` : ''}`}>
			<Icon className="state-icon" aria-hidden="true">
				{icon}
			</Icon>
			<h2>{heading}</h2>
			{details}
			<p>{description}</p>
			{children}
		</Message>
	);
}
