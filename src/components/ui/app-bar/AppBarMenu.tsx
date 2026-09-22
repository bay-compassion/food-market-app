import { useAuth0 } from '@auth0/auth0-react';
import styled from '@emotion/styled';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import ListSubheader from '@mui/material/ListSubheader';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { observer } from 'mobx-react-lite';
import { useId, useState } from 'react';
import { Link } from 'react-router';

import { authReturnUrl } from '../../../auth';
import { isFeedbackEnabled, openFeedbackForm } from '../../../sentry-feedback-trigger';
import { useRootStore } from '../../../stores/react/store-context';
import { useTranslation } from '../../../stores/react/use-translation';
import { Dialog } from '../Dialog';
import { MoreVertIcon } from '../icons/MoreVertIcon';
import { OpenExternalIcon } from '../icons/OpenExternalIcon';

const DeviceId = styled.code`
	display: block;
	padding: 14px;
	overflow-wrap: anywhere;
	border-radius: var(--radius-sm);
	color: var(--color-brand-dark);
	background: var(--color-surface-soft);
	font-size: 14px;
	line-height: 1.5;
	direction: ltr;
	text-align: start;
`;

/** Secondary navigation and the authenticated staff account, tucked behind one menu. */
export const AppBarMenu = observer(function AppBarMenu() {
	const { isAuthenticated, user, logout } = useAuth0();
	const { appBar: t, marketName } = useTranslation();
	const { guest, notifications, translations } = useRootStore();
	const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
	const [deviceDialogOpen, setDeviceDialogOpen] = useState(false);
	const [copied, setCopied] = useState(false);
	const id = useId();
	const open = Boolean(anchorEl);
	const horizontal = translations.dir === 'rtl' ? 'left' : 'right';

	function close() {
		setAnchorEl(null);
	}

	function sendFeedback() {
		close();
		void openFeedbackForm({
			text: t.feedbackForm,
			locale: translations.locale,
			dir: translations.dir,
		});
	}

	function signOut() {
		close();
		void logout({ logoutParams: { returnTo: authReturnUrl } });
	}

	function openDeviceDialog() {
		close();
		setCopied(false);
		setDeviceDialogOpen(true);
	}

	async function copyDeviceId() {
		if (!guest.deviceId) {
			return;
		}

		try {
			await navigator.clipboard.writeText(guest.deviceId);
			setCopied(true);
		} catch {
			notifications.error(t.copyDeviceIdError);
		}
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
				<MenuItem component={Link} to="/qr-code" onClick={close}>
					{t.qrCode}
				</MenuItem>
				{/* The same destination either way; what changes is whether it still asks for a sign-in. */}
				<MenuItem component={Link} to="/admin" onClick={close}>
					{isAuthenticated ? t.adminPanel : t.staffLogin}
				</MenuItem>
				{/* Only a device that has saved an identity has one to show. */}
				{guest.deviceId ? <MenuItem onClick={openDeviceDialog}>{t.showDeviceId}</MenuItem> : null}
				{isFeedbackEnabled && <MenuItem onClick={sendFeedback}>{t.sendFeedback}</MenuItem>}
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

			<Dialog
				open={deviceDialogOpen}
				title={t.deviceIdDialogTitle}
				closeLabel={t.closeDeviceIdDialog}
				onClose={() => setDeviceDialogOpen(false)}
				actions={
					<Button onClick={() => void copyDeviceId()}>
						{copied ? t.deviceIdCopied : t.copyDeviceId}
					</Button>
				}
			>
				<DeviceId>{guest.deviceId}</DeviceId>
			</Dialog>
		</>
	);
});
