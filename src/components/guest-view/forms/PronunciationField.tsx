import styled from '@emotion/styled';
import { TextField } from '@mui/material';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';

import { useRootStore } from '../../../stores/react/store-context';
import { useTranslation } from '../../../stores/react/use-translation';

const Offer = styled.button`
	justify-self: start;
	min-height: 44px;
	margin-block: -10px;
	padding: 0;
	border: 0;
	color: var(--color-brand);
	background: none;
	font: inherit;
	font-size: 15px;
	font-weight: 600;
	text-align: start;
	text-decoration: underline;
	text-underline-offset: 3px;
	cursor: pointer;
`;

/**
 * How to say the guest's name, for whoever calls it out. Optional, so it starts as a polite offer
 * the guest can pass over, and opens into the field when they take it up — already open for a
 * guest who wrote one before.
 *
 * Shown both to a new guest with the rest of their details and to a returning one, whose saved
 * name and phone are not asked for again.
 */
export const PronunciationField = observer(function PronunciationField() {
	const t = useTranslation();
	const { registration } = useRootStore();
	const [isOpen, setIsOpen] = useState(() => registration.guest.pronunciation !== '');

	if (!isOpen) {
		return (
			<Offer type="button" aria-expanded="false" onClick={() => setIsOpen(true)}>
				{t.guestView.forms.pronunciationOffer}
			</Offer>
		);
	}

	return (
		<TextField
			label={t.guestView.forms.pronunciationLabel}
			helperText={t.guestView.forms.pronunciationHelp}
			value={registration.guest.pronunciation}
			onChange={(event) => registration.updateGuest({ pronunciation: event.target.value })}
			onBlur={(event) => registration.updateGuest({ pronunciation: event.target.value.trim() })}
			slotProps={{ htmlInput: { maxLength: 100 } }}
			autoComplete="off"
			// Opened by the guest's own tap, so the field they asked for takes the focus.
			autoFocus={registration.guest.pronunciation === ''}
		/>
	);
});
