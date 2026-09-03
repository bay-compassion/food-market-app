import { TextField } from '@mui/material';

import { formatUsPhone } from '../services/phoneFormat';

export type PhoneFieldProps = {
	label: string;
	value: string;
	onChange: (value: string) => void;
	required?: boolean;
	autocomplete?: string;
	placeholder?: string;
};

/**
 * A text field specialised for US phone numbers: it formats digits into `(555) 123-4567` as the
 * guest types, rather than leaving them to type the punctuation themselves. The app only serves
 * US guests today, so there's no attempt at other countries' formats.
 */
export function PhoneField({
	label,
	value,
	onChange,
	required = false,
	autocomplete = 'tel',
	placeholder = '(555) 123-4567',
}: PhoneFieldProps) {
	return (
		<TextField
			label={label}
			value={value}
			onChange={(event) => onChange(formatUsPhone(event.target.value))}
			type="tel"
			slotProps={{ htmlInput: { inputMode: 'tel' } }}
			required={required}
			autoComplete={autocomplete}
			placeholder={placeholder}
		/>
	);
}
