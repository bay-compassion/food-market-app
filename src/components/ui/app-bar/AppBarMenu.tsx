import { useAuth0 } from '@auth0/auth0-react';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import ListSubheader from '@mui/material/ListSubheader';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { observer } from 'mobx-react-lite';
import { useId, useState } from 'react';
import { Link } from 'react-router';

import { authReturnUrl } from '../../../auth';
import { useRootStore } from '../../../stores/react/store-context';
import { useTranslation } from '../../../stores/react/use-translation';
import { MoreVertIcon } from '../icons/MoreVertIcon';
import { OpenExternalIcon } from '../icons/OpenExternalIcon';

/** Secondary navigation and the authenticated staff account, tucked behind one menu. */
export const AppBarMenu = observer(function AppBarMenu() {
	const { isAuthenticated, user, logout } = useAuth0();
	const { appBar: t, marketName } = useTranslation();
	const { translations } = useRootStore();
	const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
	const id = useId();
	const open = Boolean(anchorEl);
	const horizontal = translations.dir === 'rtl' ? 'left' : 'right';

	function close() {
		setAnchorEl(null);
	}

	function signOut() {
		close();
		void logout({ logoutParams: { returnTo: authReturnUrl } });
	}

	return (
		<>
			<IconButton
				id={`${id}-button`}
				color="inherit"
				aria-label={isAuthenticated ? t.accountMenu : t.openMenu}
				aria-controls={open ? `${id}-menu` : undefined}
				aria-haspopup="menu"
				aria-expanded={open}
				onClick={(event) => setAnchorEl(event.currentTarget)}
				sx={{ width: 44, height: 44, flexShrink: 0 }}
			>
				{isAuthenticated ? (
					<Avatar src={user?.picture} alt="" sx={{ width: 30, height: 30 }} />
				) : (
					<MoreVertIcon />
				)}
			</IconButton>
			<Menu
				anchorEl={anchorEl}
				open={open}
				onClose={close}
				anchorOrigin={{ vertical: 'bottom', horizontal }}
				transformOrigin={{ vertical: 'top', horizontal }}
				slotProps={{
					list: {
						id: `${id}-menu`,
						'aria-labelledby': `${id}-button`,
						// The account line is presentational markup, so the menu points at it to have it
						// announced on open rather than leaving it as text a screen reader walks past.
						'aria-describedby': isAuthenticated ? `${id}-account` : undefined,
					},
					paper: { dir: translations.dir, sx: { minWidth: 220 } },
				}}
			>
				<MenuItem
					component="a"
					href="https://thebaycompassion.org"
					target="_blank"
					rel="noopener"
					aria-label={t.website}
					onClick={close}
					sx={{ gap: 2 }}
				>
					{marketName}
					<OpenExternalIcon fontSize="small" sx={{ marginInlineStart: 'auto' }} />
				</MenuItem>
				<Divider />
				<MenuItem component={Link} to="/admin" onClick={close}>
					{t.staffLogin}
				</MenuItem>
				{isAuthenticated && [
					<Divider key="account-divider" />,
					/*
					 * Who is signed in, stated once here rather than on the admin page it used to head.
					 * A subheader rather than a disabled item, so it is not offered as a menu choice that
					 * happens to be unavailable — and presentational, because `role="menu"` may only own
					 * menu items and separators.
					 */
					<ListSubheader
						key="account"
						id={`${id}-account`}
						role="presentation"
						disableSticky
						sx={{
							paddingBlock: '4px',
							lineHeight: 1.4,
							fontSize: 13,
							overflow: 'hidden',
							textOverflow: 'ellipsis',
						}}
					>
						{user?.email ?? user?.name}
					</ListSubheader>,
					<MenuItem key="sign-out" onClick={signOut}>
						{t.signOut}
					</MenuItem>,
				]}
			</Menu>
		</>
	);
});
