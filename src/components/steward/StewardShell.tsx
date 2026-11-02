import styled from '@emotion/styled';
import type { ReactNode } from 'react';
import { NavLink } from 'react-router';

export const stewardViews = [
	['draw', 'Draw'],
	['guests', 'Guests'],
	['patterns', 'Patterns'],
	['changes', 'Changes'],
	['automatic', 'Automatic'],
] as const;

export type StewardView = (typeof stewardViews)[number][0];

const desktop = '@media (min-width: 1024px)';
const tabHeight = 60;

const Frame = styled.div`
	min-height: 100dvh;
	background: var(--color-background);
	color: var(--color-text);

	${desktop} {
		display: grid;
		grid-template-columns: 220px minmax(0, 1fr);
		background: var(--color-surface-muted);
	}
`;

const Title = styled.div`
	padding: 16px;
	color: var(--color-on-brand-surface);
	background: var(--color-brand-surface);
	font-family: var(--font-heading);
	font-size: 20px;
	font-weight: 700;

	${desktop} {
		padding: 0 12px 20px;
		font-size: 22px;
	}
`;

const Nav = styled.nav`
	position: fixed;
	inset-inline: 0;
	bottom: 0;
	z-index: 1100;
	display: grid;
	grid-template-columns: repeat(${stewardViews.length}, minmax(0, 1fr));
	padding-bottom: env(safe-area-inset-bottom);
	border-top: 1px solid var(--color-divider);
	background: var(--color-background);

	a {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: ${tabHeight}px;
		color: var(--color-text-subtle);
		font-size: 12px;
		font-weight: 500;
		text-decoration: none;
	}

	a[aria-current='page'] {
		color: var(--color-brand);
		font-weight: 700;
	}

	${desktop} {
		position: static;
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding: 0;
		border: 0;
		background: transparent;

		a {
			justify-content: flex-start;
			min-height: 44px;
			padding: 0 12px;
			border-radius: var(--radius-sm);
			color: var(--color-on-brand-surface);
			font-size: 15px;
		}

		a[aria-current='page'] {
			color: var(--color-on-brand-surface);
			background: var(--color-brand);
		}
	}
`;

const Rail = styled.div`
	${desktop} {
		padding: 24px 16px;
		background: var(--color-brand-surface);
	}
`;

const Content = styled.main`
	min-width: 0;
	padding: 20px 16px calc(${tabHeight + 24}px + env(safe-area-inset-bottom));

	${desktop} {
		padding: 32px;
	}
`;

export function StewardShell({ children }: { children: ReactNode }) {
	return (
		// Replay records text unless told otherwise, and everything here names a guest or their odds.
		<Frame data-sentry-mask>
			<Rail>
				<Title>Stewardship</Title>
				<Nav aria-label="Stewardship">
					{stewardViews.map(([view, label]) => (
						<NavLink key={view} to={`/steward/${view}`}>
							{label}
						</NavLink>
					))}
				</Nav>
			</Rail>
			<Content>{children}</Content>
		</Frame>
	);
}
