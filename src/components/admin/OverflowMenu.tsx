import { IconButton, Menu } from '@mui/material';
import { useState, type MouseEvent, type ReactNode } from 'react';

export type OverflowMenuProps = {
	/** Names the button for a screen reader; the icon itself says nothing. */
	label: string;
	disabled?: boolean;
	/** Opens above the button, for one along the bottom edge of the screen. */
	opensUpward?: boolean;
	/** Drawn in place of the vertical dots, for a menu that says what it holds. */
	icon?: ReactNode;
	/** Filled in, for a menu whose choice is away from its usual one. */
	active?: boolean;
	/** The menu items. Given `closeMenu` so an item can dismiss the menu once chosen. */
	children: (closeMenu: () => void) => ReactNode;
};

function MoreIcon() {
	return (
		<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" fill="currentColor">
			<circle cx="10" cy="4" r="2" />
			<circle cx="10" cy="10" r="2" />
			<circle cx="10" cy="16" r="2" />
		</svg>
	);
}

/** The vertical-dots button and the menu it opens, anchored to its trailing edge. */
export function OverflowMenu({
	label,
	disabled,
	opensUpward,
	icon,
	active = false,
	children,
}: OverflowMenuProps) {
	const [anchor, setAnchor] = useState<HTMLElement | null>(null);

	function openMenu(event: MouseEvent<HTMLElement>) {
		setAnchor(event.currentTarget);
	}

	function closeMenu() {
		setAnchor(null);
	}

	return (
		<>
			<IconButton
				className={icon ? undefined : 'more-actions'}
				aria-label={label}
				aria-haspopup="menu"
				aria-expanded={anchor ? 'true' : undefined}
				disabled={disabled}
				sx={
					active
						? {
								color: 'var(--color-on-brand)',
								background: 'var(--color-brand)',
								'&:hover': { background: 'var(--color-brand)' },
							}
						: { color: 'var(--color-brand)' }
				}
				onClick={openMenu}
			>
				{icon ?? <MoreIcon />}
			</IconButton>
			<Menu
				anchorEl={anchor}
				open={Boolean(anchor)}
				onClose={closeMenu}
				anchorOrigin={{ vertical: opensUpward ? 'top' : 'bottom', horizontal: 'right' }}
				transformOrigin={{ vertical: opensUpward ? 'bottom' : 'top', horizontal: 'right' }}
			>
				{children(closeMenu)}
			</Menu>
		</>
	);
}
