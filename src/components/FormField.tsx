import { FormControl, FormLabel, OutlinedInput, Select } from '@mui/material';
import { useId } from 'react';

import { parseNumericInput } from '../services/numericInput';

export type FormFieldOption = {
	value: string;
	label: string;
	disabled?: boolean;
};

export type FormFieldProps = {
	label: string;
	value: string | number;
	onChange: (value: string | number) => void;
	/**
	 * An `<input>` type, or one of two shapes of its own: `select` renders a native picker built
	 * from `options`, and `textarea` a multi-line box `rows` tall.
	 */
	type?: string;
	required?: boolean;
	min?: number | string;
	max?: number | string;
	inputmode?: 'text' | 'numeric' | 'tel' | 'none' | 'decimal' | 'search' | 'email' | 'url';
	autocomplete?: string;
	placeholder?: string;
	/** How tall `type="textarea"` starts out. Ignored for every other type. */
	rows?: number;
	/**
	 * Transforms the raw typed text before it is reported, such as formatting phone digits into
	 * `(555) 123-4567`. A keystroke the formatter rejects simply never reaches the value, and the
	 * input re-renders from that value, so the rejected character does not linger on screen.
	 */
	format?: (value: string) => string;
	/** The choices for `type="select"`. Ignored for every other type. */
	options?: FormFieldOption[];
	/** Reports the value once editing finishes, for work too coarse to do per keystroke. */
	onBlur?: (value: string) => void;
};

/** A labelled text, number, select, or multi-line input. */
export function FormField({
	label,
	value,
	onChange,
	type = 'text',
	required = false,
	min,
	max,
	inputmode,
	autocomplete,
	placeholder,
	rows,
	format,
	options,
	onBlur,
}: FormFieldProps) {
	const inputId = useId();

	function handleChange(raw: string) {
		if (format) {
			onChange(format(raw));

			return;
		}

		if (type === 'number') {
			onChange(parseNumericInput(raw));

			return;
		}

		// Free text is left exactly as typed: trimming it per keystroke would eat the space between
		// words the moment it was pressed.
		onChange(type === 'textarea' ? raw : raw.trim());
	}

	return (
		<FormControl className="form-field" fullWidth>
			{/* `required` is deliberately left off the label: the control carries it for validation,
			    and the design marks required fields by their copy rather than an asterisk. */}
			<FormLabel htmlFor={inputId}>{label}</FormLabel>
			{type === 'select' ? (
				<Select
					native
					id={inputId}
					value={value}
					required={required}
					input={<OutlinedInput />}
					// `Select` widens its reported value to match the `string | number` it was given.
					onChange={(event) => handleChange(String(event.target.value))}
					onBlur={(event) => onBlur?.(event.target.value)}
				>
					{options?.map((option) => (
						<option key={option.value} value={option.value} disabled={option.disabled}>
							{option.label}
						</option>
					))}
				</Select>
			) : (
				<OutlinedInput
					id={inputId}
					value={value}
					type={type === 'textarea' ? undefined : type}
					multiline={type === 'textarea'}
					rows={type === 'textarea' ? rows : undefined}
					required={required}
					inputProps={{ min, max, inputMode: inputmode }}
					autoComplete={autocomplete}
					placeholder={placeholder}
					onChange={(event) => handleChange(event.target.value)}
					onBlur={(event) => onBlur?.(event.target.value)}
				/>
			)}
		</FormControl>
	);
}
