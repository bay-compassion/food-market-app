import styled from '@emotion/styled';
import { Card, CardContent } from '@mui/material';
import type { ReactNode } from 'react';

import { GuestHelpLink } from './GuestHelpLink';

const CardHelpLink = styled(GuestHelpLink)`
	margin: 20px 0 -12px;
	padding-top: 4px;
	border-top: 1px solid var(--color-surface-soft);
	color: var(--color-text-muted);
`;

/**
 * The card a market or visit state sits in on the home screen, closing with the help link: the card
 * is what a guest is reading when the screen stops making sense to them.
 */
export function GuestStatusCard({ children }: { children: ReactNode }) {
	return (
		<Card aria-live="polite">
			<CardContent>
				{children}
				<CardHelpLink />
			</CardContent>
		</Card>
	);
}
