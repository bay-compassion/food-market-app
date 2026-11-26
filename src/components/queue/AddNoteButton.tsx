import styled from '@emotion/styled';
import { Button, ButtonGroup, Menu, MenuItem } from '@mui/material';
import { useId, useRef, useState } from 'react';

import { adminTranslations } from '../../adminLocales';
import { ExpandMoreIcon } from '../ui/icons/ExpandMoreIcon';

// Matches the desk's own pill buttons rather than MUI's default: sentence case, 44px to tap.
const Group = styled(ButtonGroup)`
	border-radius: var(--radius-pill);
	background: var(--color-background);

	.MuiButton-root {
		min-height: 44px;
		border: 1.5px solid var(--color-border);
		color: var(--color-text);
		font-size: 15px;
		font-weight: 700;
		text-transform: none;
	}

	.MuiButton-root:first-of-type {
		padding: 0 14px 0 18px;
		/* The arrow's own border is the divider, so the halves don't draw it twice. */
		border-right: 0;
		border-radius: var(--radius-pill) 0 0 var(--radius-pill);
	}

	.MuiButton-root:last-of-type {
		min-width: 44px;
		padding: 0 10px 0 8px;
		border-radius: 0 var(--radius-pill) var(--radius-pill) 0;
	}

	.MuiButton-root.Mui-disabled {
		opacity: 0.6;
	}
`;

/**
 * Adding a note, as a split button: the main half opens the note form, and the arrow offers the
 * structured notes that need no words — today, warning the guest that screenshots aren't accepted.
 */
export function AddNoteButton({
	disabled,
	onAdd,
	onWarnScreenshots,
}: {
	disabled: boolean;
	onAdd: () => void;
	onWarnScreenshots: () => void;
}) {
	const t = adminTranslations.en.queueDesk.guestNotes;
	const anchor = useRef<HTMLDivElement>(null);
	const [isOpen, setIsOpen] = useState(false);
	const menuId = useId();

	return (
		<>
			<Group ref={anchor} variant="outlined" disabled={disabled}>
				<Button onClick={onAdd}>{t.add}</Button>
				<Button
					aria-label={t.moreAddOptions}
					aria-haspopup="menu"
					aria-expanded={isOpen}
					aria-controls={isOpen ? menuId : undefined}
					onClick={() => setIsOpen(true)}
				>
					<ExpandMoreIcon fontSize="small" />
				</Button>
			</Group>
			<Menu
				id={menuId}
				anchorEl={anchor.current}
				open={isOpen}
				onClose={() => setIsOpen(false)}
				anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
				transformOrigin={{ vertical: 'top', horizontal: 'right' }}
			>
				<MenuItem
					onClick={() => {
						setIsOpen(false);
						onWarnScreenshots();
					}}
				>
					{t.screenshotNotice.record}
				</MenuItem>
			</Menu>
		</>
	);
}
