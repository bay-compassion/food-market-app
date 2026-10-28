import { Card, CardContent } from '@mui/material';
import type { ReactNode } from 'react';

/** The card a market or visit state sits in on the home screen. */
export function GuestStatusCard({ children }: { children: ReactNode }) {
	return (
		<Card aria-live="polite">
			<CardContent>{children}</CardContent>
		</Card>
	);
}
