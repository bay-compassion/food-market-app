import { Card, CardContent } from '@mui/material';
import type { ReactNode } from 'react';

/**
 * The card a market or visit state sits in on the home screen. A `frameless` one keeps the live
 * region but drops the border and padding, for a state that lays out its own panels.
 */
export function GuestStatusCard({
	children,
	frameless = false,
}: {
	children: ReactNode;
	frameless?: boolean;
}) {
	if (frameless) {
		return <div aria-live="polite">{children}</div>;
	}

	return (
		<Card aria-live="polite">
			<CardContent>{children}</CardContent>
		</Card>
	);
}
