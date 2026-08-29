import styled from '@emotion/styled';
import type { ChangeEvent } from 'react';

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
	type?: string;
	required?: boolean;
	min?: number | string;
	max?: number | string;
	inputmode?: 'text' | 'numeric' | 'tel' | 'none' | 'decimal' | 'search' | 'email' | 'url';
	autocomplete?: string;
	placeholder?: string;
	/**
	 * Transforms the raw typed text before it is reported, such as formatting phone digits into
	 * `(555) 123-4567`. A keystroke the formatter rejects simply never reaches the value, and the
	 * input re-renders from that value, so the rejected character does not linger on screen.
	 */
	format?: (value: string) => string;
	/** The choices for `type="select"`. Ignored for every other type. */
	options?: FormFieldOption[];
};

const Field = styled.label`
	display: grid;
	gap: 8px;
	color: var(--color-text);

	> span {
		font-family: var(--font-heading);
		font-size: 16px;
		font-weight: 700;
	}

	input,
	select {
		width: 100%;
		height: 58px;
		padding: 0 16px;
		color: var(--color-text);
		font-family: var(--font-body);
		font-size: 16px;
		font-weight: 400;
		border: 2px solid var(--color-border);
		border-radius: var(--radius-md);
		outline: 0;
		background: var(--color-background);
	}

	input::placeholder {
		color: var(--color-placeholder);
	}
`;

/** A labelled text, number, or select input. */
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
	format,
	options,
}: FormFieldProps) {
	function handleChange(event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
		const raw = event.target.value;

		if (format) {
			onChange(format(raw));

			return;
		}

		onChange(type === 'number' ? parseNumericInput(raw) : raw.trim());
	}

	return (
		<Field className="form-field">
			<span>{label}</span>
			{type === 'select' ? (
				<select value={value} required={required} onChange={handleChange}>
					{options?.map((option) => (
						<option key={option.value} value={option.value} disabled={option.disabled}>
							{option.label}
						</option>
					))}
				</select>
			) : (
				<input
					value={value}
					type={type}
					required={required}
					min={min}
					max={max}
					inputMode={inputmode}
					autoComplete={autocomplete}
					placeholder={placeholder}
					onChange={handleChange}
				/>
			)}
		</Field>
	);
}
