import styled from '@emotion/styled';
import { Drawer } from '@mui/material';

/**
 * A panel that rises from the bottom edge, under the thumb on a phone. Anchor it with
 * `anchor="bottom"`.
 *
 * It renders in a portal, outside both `.app-shell` and `.admin-dashboard`, so it carries its own
 * styles and whoever opens it sets its writing direction.
 */
export const BottomSheet = styled(Drawer)`
	.MuiBackdrop-root {
		background: rgb(30 71 77 / 62%);
	}

	.MuiDrawer-paper {
		box-sizing: border-box;
		width: min(100%, 480px);
		max-height: calc(100dvh - 32px);

		/* Anchored bottom, so the paper spans the viewport; this centres it on a wider screen. */
		margin-inline: auto;
		padding: 22px 22px calc(22px + env(safe-area-inset-bottom));
		overflow-y: auto;
		border-radius: var(--radius-lg) var(--radius-lg) 0 0;
		color: var(--color-text);
		background: var(--color-background);
		box-shadow: 0 -18px 60px rgb(30 71 77 / 24%);
	}
`;
