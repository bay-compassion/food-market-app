import { FormHelperText, TextField } from '@mui/material';
import { observer } from 'mobx-react-lite';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

import { useRootStore } from '../../../stores/react/store-context';

type GuestNameFieldProps = {
	field: 'firstName' | 'lastName';
	label: string;
	autoComplete: 'given-name' | 'family-name';
	/** Shown under the field when the name is only initials. */
	initialsMessage: string;
	/**
	 * Wraps the field in whatever hangs from it — the pronunciation strip under a first name — so the
	 * message goes under the two together rather than between them.
	 */
	attach?: (field: ReactNode) => ReactNode;
};

/**
 * One of the guest's names, which has to be the name itself rather than its initials.
 *
 * The message waits until the guest has left the field or tried to submit, so typing "J" on the way
 * to "Jo" is not scolded, then clears as soon as the name is whole. It is also the input's custom
 * validity, so tapping submit brings the guest back here the way an empty field would — which is
 * how a returning guest whose saved name is only initials finds out why.
 */
export const GuestNameField = observer(function GuestNameField({
	field,
	label,
	autoComplete,
	initialsMessage,
	attach = (field) => field,
}: GuestNameFieldProps) {
	const { registration } = useRootStore();
	const errorId = useId();
	const input = useRef<HTMLInputElement>(null);
	const [isTouched, setIsTouched] = useState(false);
	const validity = registration.nameIssues[field] === 'initials-only' ? initialsMessage : '';

	useEffect(() => {
		input.current?.setCustomValidity(validity);
	}, [validity]);

	const showsError = validity !== '' && isTouched;

	const textField = (
		<TextField
			label={label}
			value={registration.guest[field]}
			inputRef={input}
			onChange={(event) => registration.updateGuest({ [field]: event.target.value })}
			// Trimmed on the way out rather than on every keystroke: trimming as the guest types would
			// eat the space the moment it was pressed, leaving no way to enter a name in two words. The
			// server trims these fields again before storing them.
			onBlur={(event) => {
				setIsTouched(true);
				registration.updateGuest({ [field]: event.target.value.trim() });
			}}
			onInvalid={() => setIsTouched(true)}
			error={showsError}
			// Not the field's own helper text, which would sit between it and anything attached to it.
			slotProps={{ htmlInput: { 'aria-describedby': showsError ? errorId : undefined } }}
			required
			autoComplete={autoComplete}
		/>
	);

	return (
		<div>
			{attach(textField)}
			{showsError ? (
				<FormHelperText id={errorId} error variant="outlined">
					{initialsMessage}
				</FormHelperText>
			) : null}
		</div>
	);
});
