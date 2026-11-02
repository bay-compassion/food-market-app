import styled from '@emotion/styled';
import { Fab } from '@mui/material';

import { adminTranslations } from '../../adminLocales';
import { tabBarHeight } from './admin-layout';

const Floating = styled(Fab)`
	position: fixed;
	inset-inline-end: 16px;
	bottom: calc(${tabBarHeight + 16}px + env(safe-area-inset-bottom));
	gap: 6px;
	text-transform: none;
`;

export type AddGuestFabProps = {
	onClick: () => void;
};

/**
 * Adding a guest from anywhere on a long phone screen. It always does this one thing, whatever the
 * session's phase: people tap a floating button from habit, and the other actions on these screens
 * have consequences. What adding means in this phase is up to the form it opens.
 */
export function AddGuestFab({ onClick }: AddGuestFabProps) {
	const t = adminTranslations.en;

	return (
		<Floating
			type="button"
			className="add-guest-fab"
			variant="extended"
			color="primary"
			onClick={onClick}
		>
			<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
				<path
					d="M12 5v14M5 12h14"
					fill="none"
					stroke="currentColor"
					strokeWidth="2.6"
					strokeLinecap="round"
				/>
			</svg>
			{t.addGuest}
		</Floating>
	);
}
