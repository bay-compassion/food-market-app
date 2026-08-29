import { formatUsPhone } from '../services/phoneFormat';
import { FormField } from './FormField';

export type PhoneFieldProps = {
	label: string;
	value: string;
	onChange: (value: string) => void;
	required?: boolean;
	autocomplete?: string;
	placeholder?: string;
};

/**
 * A `FormField` specialised for US phone numbers: it formats digits into `(555) 123-4567` as the
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
		<FormField
			label={label}
			value={value}
			onChange={(next) => onChange(String(next))}
			type="tel"
			inputmode="tel"
			required={required}
			autocomplete={autocomplete}
			placeholder={placeholder}
			format={formatUsPhone}
		/>
	);
}
