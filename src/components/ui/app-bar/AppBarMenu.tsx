import { useAuth0 } from '@auth0/auth0-react';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import ListSubheader from '@mui/material/ListSubheader';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { observer } from 'mobx-react-lite';
import { useId, useState } from 'react';
import { Link, useNavigate } from 'react-router';

import { authReturnUrl } from '../../../auth';
import { isFeedbackEnabled, openFeedbackForm } from '../../../sentry-feedback-trigger';
import { useRootStore } from '../../../stores/react/store-context';
import { useTranslation } from '../../../stores/react/use-translation';
import { useGuestTourEnabled } from '../../hooks/use-guest-tour-enabled';
import { DashboardIcon } from '../icons/DashboardIcon';
import { ExploreIcon } from '../icons/ExploreIcon';
import { FeedbackIcon } from '../icons/FeedbackIcon';
import { GlobeIcon } from '../icons/GlobeIcon';
import { HelpIcon } from '../icons/HelpIcon';
import { LoginIcon } from '../icons/LoginIcon';
import { LogoutIcon } from '../icons/LogoutIcon';
import { MoreVertIcon } from '../icons/MoreVertIcon';
import { OpenExternalIcon } from '../icons/OpenExternalIcon';
import { QrCodeIcon } from '../icons/QrCodeIcon';
import { SmartphoneIcon } from '../icons/SmartphoneIcon';
import { DeviceDetailsDialog } from './DeviceDetailsDialog';

/** Secondary navigation and the authenticated staff account, tucked behind one menu. */
export const AppBarMenu = observer(function AppBarMenu() {
	const { isAuthenticated, user, logout } = useAuth0();
	const { appBar: t, help, marketName } = useTranslation();
	const { tour, translations } = useRootStore();
	const navigate = useNavigate();
	const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
	const [tourRequested, setTourRequested] = useState(false);
	const tourEnabled = useGuestTourEnabled();
	const [deviceDialogOpen, setDeviceDialogOpen] = useState(false);
	const id = useId();
	const open = Boolean(anchorEl);
	const horizontal = translations.dir === 'rtl' ? 'left' : 'right';

	function close() {
		setAnchorEl(null);
	}

	/** The tour is of the home screen, so a guest elsewhere is taken there first. */
	function takeTour() {
		close();
		setTourRequested(true);
		void navigate('/');
	}

	/**
	 * The tour starts once the menu has finished closing: until then the menu still holds focus, and
	 * returns it to its button on the way out, which would pull it from the tour's first step.
	 */
	function startRequestedTour() {
		if (tourRequested) {
			setTourRequested(false);
			tour.start();
		}
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
		setDeviceDialogOpen(true);
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
				data-tour="menu"
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
					transition: { onExited: startRequestedTour },
				}}
			>
				<MenuItem
					component="a"
					href="https://thebaycompassion.org"
					target="_blank"
					rel="noopener"
					aria-label={t.website}
					onClick={close}
				>
					<ListItemIcon>
						<GlobeIcon fontSize="small" />
					</ListItemIcon>
					<ListItemText>{marketName}</ListItemText>
					<OpenExternalIcon fontSize="small" sx={{ marginInlineStart: 2 }} />
				</MenuItem>
				<Divider />
				<MenuItem component={Link} to="/help" onClick={close}>
					<ListItemIcon>
						<HelpIcon fontSize="small" />
					</ListItemIcon>
					{help.title}
				</MenuItem>
				{tourEnabled ? (
					<MenuItem onClick={takeTour}>
						<ListItemIcon>
							<ExploreIcon fontSize="small" />
						</ListItemIcon>
						{t.takeTour}
					</MenuItem>
				) : null}
				<MenuItem component={Link} to="/qr-code" onClick={close}>
					<ListItemIcon>
						<QrCodeIcon fontSize="small" />
					</ListItemIcon>
					{t.qrCode}
				</MenuItem>
				<Divider />
				{/* Every device has details to show: its install ID exists from the first launch. */}
				<MenuItem onClick={openDeviceDialog}>
					<ListItemIcon>
						<SmartphoneIcon fontSize="small" />
					</ListItemIcon>
					{t.deviceDetails.title}
				</MenuItem>
				{isFeedbackEnabled ? (
					<MenuItem onClick={sendFeedback}>
						<ListItemIcon>
							<FeedbackIcon fontSize="small" />
						</ListItemIcon>
						{t.sendFeedback}
					</MenuItem>
				) : null}
				<Divider />
				{isAuthenticated ? (
					/*
					 * Who is signed in, stated once here rather than on the admin page it used to head.
					 * A subheader rather than a disabled item, so it is not offered as a menu choice that
					 * happens to be unavailable — and presentational, because `role="menu"` may only own
					 * menu items and separators.
					 */
					<ListSubheader
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
					</ListSubheader>
				) : null}
				{/* The same destination either way; what changes is whether it still asks for a sign-in. */}
				<MenuItem component={Link} to="/admin" onClick={close}>
					<ListItemIcon>
						{isAuthenticated ? <DashboardIcon fontSize="small" /> : <LoginIcon fontSize="small" />}
					</ListItemIcon>
					{isAuthenticated ? t.adminPanel : t.staffLogin}
				</MenuItem>
				{isAuthenticated ? (
					<MenuItem onClick={signOut}>
						<ListItemIcon>
							<LogoutIcon fontSize="small" />
						</ListItemIcon>
						{t.signOut}
					</MenuItem>
				) : null}
			</Menu>

			<DeviceDetailsDialog open={deviceDialogOpen} onClose={() => setDeviceDialogOpen(false)} />
		</>
	);
});
