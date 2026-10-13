import styled from '@emotion/styled';
import { Accordion, AccordionDetails, AccordionSummary, TextField } from '@mui/material';
import { observer } from 'mobx-react-lite';
import { useRef } from 'react';

import { useRootStore } from '../../../stores/react/store-context';
import { useTranslation } from '../../../stores/react/use-translation';
import { ExpandMoreIcon } from '../../ui/icons/ExpandMoreIcon';

const Panel = styled(Accordion)`
	border: 2px solid var(--color-border);
	border-radius: var(--radius-md);
	color: var(--color-text);
	background: var(--color-surface-soft);

	/* MUI draws a divider above each panel for a stacked group; this one stands alone. */
	&::before {
		display: none;
	}

	.MuiAccordionSummary-root {
		min-height: 52px;
		padding: 0 14px;
	}

	.MuiAccordionSummary-content {
		margin: 12px 0;
		font-size: 15px;
		font-weight: 600;
	}

	.MuiAccordionDetails-root {
		padding: 0 14px 16px;
	}
`;

/**
 * How to say the guest's name, for whoever calls it out. Optional, so it starts as a folded panel
 * that politely offers the field, and opens when the guest takes the offer up — already open for a
 * guest who wrote one before.
 *
 * Shown both to a new guest with the rest of their details and to a returning one, whose saved
 * name and phone are not asked for again.
 */
export const PronunciationField = observer(function PronunciationField() {
	const t = useTranslation();
	const { registration } = useRootStore();
	const input = useRef<HTMLInputElement>(null);

	return (
		<Panel
			className="pronunciation-panel"
			defaultExpanded={registration.guest.pronunciation !== ''}
			disableGutters
			elevation={0}
			slotProps={{
				// Opened by the guest's own tap, so the field they asked for takes the focus.
				transition: { unmountOnExit: true, onEntered: () => input.current?.focus() },
			}}
		>
			<AccordionSummary expandIcon={<ExpandMoreIcon />}>
				{t.guestView.forms.pronunciationOffer}
			</AccordionSummary>
			<AccordionDetails>
				<TextField
					fullWidth
					inputRef={input}
					label={t.guestView.forms.pronunciationLabel}
					helperText={t.guestView.forms.pronunciationHelp}
					value={registration.guest.pronunciation}
					onChange={(event) => registration.updateGuest({ pronunciation: event.target.value })}
					onBlur={(event) => registration.updateGuest({ pronunciation: event.target.value.trim() })}
					slotProps={{ htmlInput: { maxLength: 100 } }}
					autoComplete="off"
				/>
			</AccordionDetails>
		</Panel>
	);
});
