import styled from '@emotion/styled';
import type { ReactNode } from 'react';

import { adminTranslations } from '../../adminLocales';
import { useCountdownTimer } from '../hooks/use-countdown-timer';
import { formatCountdown } from './session-format';

const Card = styled.section<{ $attention: boolean }>`
	display: grid;
	gap: 6px;
	padding: 18px;
	border-radius: var(--radius-md);
	background: ${({ $attention }) =>
		$attention ? 'var(--color-warning-surface)' : 'var(--color-surface-soft)'};
	--status-color: ${({ $attention }) =>
		$attention ? 'var(--color-warning)' : 'var(--color-brand)'};

	p {
		margin: 0;
	}

	.lead {
		color: ${({ $attention }) => ($attention ? 'var(--color-warning)' : 'var(--color-brand-dark)')};
		font-size: 14px;
		font-weight: 700;
	}

	.value {
		color: var(--status-color);
		font-family: var(--font-heading);
		font-size: 44px;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		line-height: 1.05;
	}

	.value[data-due='true'] {
		font-size: 22px;
	}

	.help {
		color: var(--color-text-muted);
		font-size: 15px;
		line-height: 1.45;
	}
`;

export type SessionStatusCardProps = {
	/** Whether anything is needed and when, in a line. */
	lead: string;
	/** The one thing to read: a time, a countdown, or a short state. */
	value: ReactNode;
	help: string;
	/** For the moment nearest an irreversible step: the draw. */
	attention?: boolean;
};

/**
 * What a worker opens the Today screen to find out: what happens next, and whether it needs them.
 * The market runs on timers, so the answer is usually that it does not.
 */
export function SessionStatusCard({
	lead,
	value,
	help,
	attention = false,
}: SessionStatusCardProps) {
	return (
		<Card $attention={attention}>
			<p className="lead">{lead}</p>
			{value}
			<p className="help">{help}</p>
		</Card>
	);
}

/** The card's value as a fixed piece of text. */
export function SessionStatusValue({ children }: { children: ReactNode }) {
	return <p className="value">{children}</p>;
}

/** The card's value as a live countdown to `deadline`. */
export function SessionCountdown({ deadline }: { deadline: Date }) {
	const t = adminTranslations.en;
	const remaining = useCountdownTimer(deadline.valueOf());
	const isDue = remaining <= 0;

	return (
		<p className="value" role="timer" data-due={isDue}>
			{isDue ? t.transitionDue : formatCountdown(remaining)}
		</p>
	);
}
