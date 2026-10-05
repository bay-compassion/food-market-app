import styled from '@emotion/styled';
import { Menu, MenuItem } from '@mui/material';
import { useId, useState } from 'react';

import { adminTranslations } from '../../adminLocales';
import type { QueuePlacement } from '../../services/guestAdmission';

export type ReturnToQueueButtonProps = {
	disabled?: boolean;
	onReturn: (placement: QueuePlacement) => void;
};

/**
 * One pill split in two. The pill shape and colors come from the action row around it; this only
 * squares off the inner edges so the halves read as one control.
 */
const Group = styled.div`
	display: inline-flex;
	gap: 2px;

	&& > button:first-of-type {
		border-start-end-radius: 0;
		border-end-end-radius: 0;
	}

	&& > button:last-of-type {
		padding: 0 12px;
		border-start-start-radius: 0;
		border-end-start-radius: 0;
	}
`;

function ArrowDown() {
	return (
		<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" fill="none">
			<path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
		</svg>
	);
}

/**
 * Puts a guest back in line. The button sends them to the back, which is where a no-show has
 * earned; the arrow beside it offers the front instead, for a guest called by mistake or one the
 * volunteer judges should not lose their turn.
 */
export function ReturnToQueueButton({ disabled, onReturn }: ReturnToQueueButtonProps) {
	const t = adminTranslations.en.queueDesk;
	const menuId = useId();
	const [anchor, setAnchor] = useState<HTMLElement | null>(null);

	function choose(placement: QueuePlacement) {
		setAnchor(null);
		onReturn(placement);
	}

	return (
		<Group className="return-to-queue">
			<button type="button" disabled={disabled} onClick={() => choose('end')}>
				{t.returnToBack}
			</button>
			<button
				type="button"
				aria-label={t.returnOptions}
				aria-haspopup="menu"
				aria-controls={anchor ? menuId : undefined}
				aria-expanded={anchor ? 'true' : undefined}
				disabled={disabled}
				onClick={(event) => setAnchor(event.currentTarget)}
			>
				<ArrowDown />
			</button>
			<Menu
				id={menuId}
				anchorEl={anchor}
				open={anchor !== null}
				onClose={() => setAnchor(null)}
				anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
				transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
				// Above the ticket sheet it opens from, which is itself a modal drawer.
				sx={{ zIndex: (theme) => theme.zIndex.modal + 1 }}
			>
				<MenuItem onClick={() => choose('end')}>{t.returnToBack}</MenuItem>
				<MenuItem onClick={() => choose('next')}>{t.returnToFront}</MenuItem>
			</Menu>
		</Group>
	);
}
