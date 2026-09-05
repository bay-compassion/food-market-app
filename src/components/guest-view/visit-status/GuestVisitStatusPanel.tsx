import styled from '@emotion/styled';
import type { ReactNode } from 'react';

/** How loudly the status mark is painted. `action` is the only one that asks the guest to move. */
export type GuestVisitStatusTone = 'brand' | 'action' | 'warning' | 'muted';

const toneBackgrounds: Record<GuestVisitStatusTone, string> = {
	brand: 'var(--color-brand)',
	action: 'var(--color-success)',
	warning: 'var(--color-warning)',
	muted: 'var(--color-text-subtle)',
};

export type GuestVisitStatusPanelProps = {
	icon: string;
	heading: string;
	description?: string;
	details?: ReactNode;
	tone?: GuestVisitStatusTone;
	iconClassName?: string;
};

const Panel = styled.div`
	display: grid;
	min-height: 340px;
	place-content: center;
	text-align: center;

	h2 {
		margin-bottom: 9px;
		font-family: var(--font-heading);
		font-size: 29px;
		letter-spacing: -0.01em;
		text-transform: uppercase;
		color: var(--color-text);
	}

	p {
		max-width: 280px;
		margin: 0 auto 27px;
		color: var(--color-text-muted);
		font-size: 16px;
		line-height: 1.55;
	}
`;

const StatusIcon = styled.div<{ $tone: GuestVisitStatusTone }>`
	display: grid;
	width: 58px;
	height: 58px;
	place-self: center;
	place-items: center;
	margin-bottom: 19px;
	border-radius: var(--radius-md);
	color: var(--color-on-brand);
	background: ${({ $tone }) => toneBackgrounds[$tone]};
	font-size: ${({ $tone }) => ($tone === 'action' ? '34px' : '29px')};
`;

/** Shared visual frame for a visit state; state-specific components supply its content. */
export function GuestVisitStatusPanel({
	icon,
	heading,
	description,
	details,
	tone = 'brand',
	iconClassName,
}: GuestVisitStatusPanelProps) {
	return (
		<Panel className="success-state">
			<StatusIcon
				className={`checkmark${iconClassName ? ` ${iconClassName}` : ''}`}
				$tone={tone}
				aria-hidden="true"
			>
				{icon}
			</StatusIcon>
			<h2>{heading}</h2>
			{details}
			{description ? <p>{description}</p> : null}
		</Panel>
	);
}
