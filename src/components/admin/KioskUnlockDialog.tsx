import styled from '@emotion/styled';
import { Button } from '@mui/material';
import { observer } from 'mobx-react-lite';

import { adminTranslations } from '../../adminLocales';
import { useRootStore } from '../../stores/react/store-context';
import { useNow } from '../hooks/use-now';
import { Dialog } from '../ui/Dialog';

// The dialog renders in a portal outside `.admin-dashboard`, so it carries its own styles.
const Body = styled.div`
	display: grid;
	gap: 14px;
	justify-items: center;
	text-align: center;

	.kiosk-unlock-code {
		margin: 0;
		color: var(--color-brand-dark);
		font-family: var(--font-heading);
		font-size: 48px;
		font-variant-numeric: tabular-nums;
		font-weight: 700;
		letter-spacing: 0.12em;
	}

	/* Shown without the scheme, as a worker would type it; long hosts wrap rather than overflow. */
	.kiosk-unlock-address {
		color: var(--color-brand-dark);
		font-size: 20px;
		font-weight: 700;
		overflow-wrap: anywhere;
		user-select: all;
	}

	.kiosk-unlock-code[data-expired] {
		color: var(--color-text-subtle);
		text-decoration: line-through;
	}

	p {
		margin: 0;
		color: var(--color-text-muted);
		line-height: 1.5;
	}
`;

/**
 * Where a room display goes and the six digits that unlock it, read off a worker's phone — the
 * address too, since a worker setting up a display may not know the app has a `/kiosk` page.
 * Mounted by both the dashboard and the queue screen; it shows whenever the admin store holds a
 * code. A code that lapses with the dialog open is struck through rather than left looking usable.
 */
export const KioskUnlockDialog = observer(function KioskUnlockDialog() {
	const t = adminTranslations.en.kioskUnlock;
	const { admin } = useRootStore();
	const unlock = admin.kioskUnlockCode;
	const now = useNow(unlock ? 5_000 : null);

	if (!unlock) {
		return null;
	}

	const expiresAt = new Date(unlock.expiresAt);
	const expired = now >= expiresAt.getTime();
	const time = new Intl.DateTimeFormat(undefined, { timeStyle: 'short' }).format(expiresAt);
	// This deploy's own host, so a preview site names itself rather than production.
	const address = `${window.location.host}/kiosk`;

	return (
		<Dialog
			open
			title={t.title}
			closeLabel={t.done}
			onClose={() => admin.dismissKioskUnlockCode()}
			actions={
				<>
					<Button type="button" onClick={() => void admin.showKioskUnlockCode()}>
						{t.newCode}
					</Button>
					<Button type="button" variant="contained" onClick={() => admin.dismissKioskUnlockCode()}>
						{t.done}
					</Button>
				</>
			}
		>
			<Body>
				<p>{t.goTo}</p>
				<p className="kiosk-unlock-address">{address}</p>
				<p>{t.typeCode}</p>
				<p className="kiosk-unlock-code" data-expired={expired || undefined}>
					{unlock.code}
				</p>
				<p aria-live="polite">{expired ? t.expired : t.instructions.replace('{time}', time)}</p>
			</Body>
		</Dialog>
	);
});
