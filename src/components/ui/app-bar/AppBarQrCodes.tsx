import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { observer } from 'mobx-react-lite';
import { useId, useState } from 'react';
import { Link } from 'react-router';

import { adminTranslations } from '../../../adminLocales';
import { premarketPosterPath } from '../../../services/premarket';
import { posterPermission, standbyPosterPath } from '../../../services/qr-posters';
import { useRootStore } from '../../../stores/react/store-context';
import { useTranslation } from '../../../stores/react/use-translation';
import { ChevronRightIcon } from '../icons/ChevronRightIcon';
import { QrCodeIcon } from '../icons/QrCodeIcon';

/**
 * The app bar menu's QR code entry. Everyone gets the market's own poster, `/qr-code`. An admin
 * gets a submenu instead, with the premarket's and the current session's standby posters beside it:
 * those codes are handed out at the market, never advertised. Whether someone is an admin is known
 * once a signed-in screen has read their permissions.
 */
export const AppBarQrCodes = observer(function AppBarQrCodes({
	onNavigate,
}: {
	/** Closes the app bar menu once a poster is chosen. */
	onNavigate: () => void;
}) {
	const { appBar } = useTranslation();
	const { admin, translations } = useRootStore();
	const t = adminTranslations.en.qrPosters;
	const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
	const id = useId();
	const rtl = translations.dir === 'rtl';

	if (!admin.can(posterPermission)) {
		return (
			<MenuItem component={Link} to="/qr-code" onClick={onNavigate}>
				<ListItemIcon>
					<QrCodeIcon fontSize="small" />
				</ListItemIcon>
				{appBar.qrCode}
			</MenuItem>
		);
	}

	function choose() {
		setAnchorEl(null);
		onNavigate();
	}

	const posters = [
		{ to: '/qr-code', label: t.market },
		{ to: premarketPosterPath, label: t.premarket },
		{ to: standbyPosterPath, label: t.standby },
	];

	return (
		<>
			<MenuItem
				id={`${id}-trigger`}
				aria-haspopup="menu"
				aria-expanded={anchorEl ? 'true' : 'false'}
				aria-controls={anchorEl ? `${id}-menu` : undefined}
				onClick={(event) => setAnchorEl(event.currentTarget)}
				onKeyDown={(event) => {
					if (event.key === (rtl ? 'ArrowLeft' : 'ArrowRight')) {
						setAnchorEl(event.currentTarget);
					}
				}}
			>
				<ListItemIcon>
					<QrCodeIcon fontSize="small" />
				</ListItemIcon>
				<ListItemText>{t.menu}</ListItemText>
				<ChevronRightIcon
					fontSize="small"
					sx={{ marginInlineStart: 2, transform: rtl ? 'scaleX(-1)' : undefined }}
				/>
			</MenuItem>
			<Menu
				id={`${id}-menu`}
				anchorEl={anchorEl}
				open={Boolean(anchorEl)}
				onClose={() => setAnchorEl(null)}
				anchorOrigin={{ vertical: 'top', horizontal: rtl ? 'left' : 'right' }}
				transformOrigin={{ vertical: 'top', horizontal: rtl ? 'right' : 'left' }}
				slotProps={{ list: { 'aria-labelledby': `${id}-trigger` } }}
			>
				{posters.map(({ to, label }) => (
					<MenuItem key={to} component={Link} to={to} onClick={choose}>
						{label}
					</MenuItem>
				))}
			</Menu>
		</>
	);
});
