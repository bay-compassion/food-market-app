import { Button, IconButton, Menu, MenuItem } from '@mui/material';
import { observer } from 'mobx-react-lite';
import { useState, type MouseEvent } from 'react';

import { useRootStore } from '../../../stores/react/store-context';
import { useTranslation } from '../../../stores/react/use-translation';
import { Dialog } from '../../ui/Dialog';

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
	const { guest, notifications, registration, translations } = useRootStore();
	const copy = useTranslation().guestView.identityIndicator;
	const [anchor, setAnchor] = useState<HTMLElement | null>(null);
	const [forgetDialogOpen, setForgetDialogOpen] = useState(false);
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

	function openForgetDialog() {
		closeMenu();
		setForgetDialogOpen(true);
	}

	function forgetInformation() {
		setForgetDialogOpen(false);
		void guest.forget();
		// The form still on screen is a form the guest just asked to have forgotten — it must not
		// keep offering the identity or household counts back on the next field it reads.
		registration.resetToDeviceState();
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
			</Menu>

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
