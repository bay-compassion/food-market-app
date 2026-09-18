import styled from '@emotion/styled';
import { Button, IconButton, Menu, MenuItem } from '@mui/material';
import { observer } from 'mobx-react-lite';
import { useState, type MouseEvent } from 'react';

import { useRootStore } from '../../../stores/react/store-context';
import { useTranslation } from '../../../stores/react/use-translation';
import { Dialog } from '../../ui/Dialog';

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

function MoreIcon() {
	return (
		<svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">
			<circle cx="12" cy="5" r="2" />
			<circle cx="12" cy="12" r="2" />
			<circle cx="12" cy="19" r="2" />
		</svg>
	);
}

/** Actions that apply to the identity stored on this browser. */
export const GuestIdentityMenu = observer(function GuestIdentityMenu() {
	const { guest, notifications, translations } = useRootStore();
	const copy = useTranslation().guestView.identityIndicator;
	const [anchor, setAnchor] = useState<HTMLElement | null>(null);
	const [deviceDialogOpen, setDeviceDialogOpen] = useState(false);
	const [forgetDialogOpen, setForgetDialogOpen] = useState(false);
	const [copied, setCopied] = useState(false);
	const [optingOut, setOptingOut] = useState(false);
	const horizontal = translations.dir === 'rtl' ? 'left' : 'right';

	function openMenu(event: MouseEvent<HTMLElement>) {
		setAnchor(event.currentTarget);
	}

	function closeMenu() {
		setAnchor(null);
	}

	async function optOut() {
		closeMenu();
		setOptingOut(true);

		try {
			await guest.disableSmsNotifications();
		} catch {
			notifications.error(copy.optOutError);
		} finally {
			setOptingOut(false);
		}
	}

	async function copyDeviceId() {
		if (!guest.deviceId) {
			return;
		}

		try {
			await navigator.clipboard.writeText(guest.deviceId);
			setCopied(true);
		} catch {
			notifications.error(copy.copyDeviceIdError);
		}
	}

	function openDeviceDialog() {
		closeMenu();
		setCopied(false);
		setDeviceDialogOpen(true);
	}

	function openForgetDialog() {
		closeMenu();
		setForgetDialogOpen(true);
	}

	function forgetInformation() {
		setForgetDialogOpen(false);
		void guest.forget();
	}

	return (
		<>
			<IconButton
				aria-label={copy.openIdentityMenu}
				aria-haspopup="menu"
				aria-expanded={anchor ? 'true' : undefined}
				onClick={openMenu}
				sx={{ flex: '0 0 auto', color: 'var(--color-brand)' }}
			>
				<MoreIcon />
			</IconButton>
			<Menu
				anchorEl={anchor}
				open={Boolean(anchor)}
				onClose={closeMenu}
				anchorOrigin={{ vertical: 'bottom', horizontal }}
				transformOrigin={{ vertical: 'top', horizontal }}
				slotProps={{ paper: { dir: translations.dir } }}
			>
				<MenuItem disabled={!guest.smsConsented || optingOut} onClick={() => void optOut()}>
					{copy.optOut}
				</MenuItem>
				<MenuItem onClick={openForgetDialog}>{copy.forgetInformation}</MenuItem>
				<MenuItem onClick={openDeviceDialog}>{copy.showDeviceId}</MenuItem>
			</Menu>

			<Dialog
				open={deviceDialogOpen}
				title={copy.deviceIdDialogTitle}
				closeLabel={copy.closeDeviceIdDialog}
				onClose={() => setDeviceDialogOpen(false)}
				actions={
					<Button onClick={() => void copyDeviceId()}>
						{copied ? copy.deviceIdCopied : copy.copyDeviceId}
					</Button>
				}
			>
				<DeviceId>{guest.deviceId}</DeviceId>
			</Dialog>

			<Dialog
				open={forgetDialogOpen}
				title={copy.forgetDialogTitle}
				closeLabel={copy.closeForgetDialog}
				onClose={() => setForgetDialogOpen(false)}
				actions={
					<>
						<Button onClick={() => setForgetDialogOpen(false)}>
							{copy.cancelForgetInformation}
						</Button>
						<Button color="error" variant="contained" onClick={forgetInformation}>
							{copy.forgetInformation}
						</Button>
					</>
				}
			>
				<p>{copy.forgetDialogDescription}</p>
			</Dialog>
		</>
	);
});
