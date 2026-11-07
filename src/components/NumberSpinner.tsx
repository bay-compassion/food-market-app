import { NumberField } from '@base-ui/react/number-field';
import styled from '@emotion/styled';
import { Button, FormLabel, IconButton, InputAdornment, OutlinedInput } from '@mui/material';
import { useId } from 'react';

import { useCountEntry } from './hooks/use-count-entry';
import { ClearGlyph, StepGlyph } from './NumberSpinnerGlyphs';

export type NumberSpinnerProps = {
	label: string;
	disabled?: boolean;
	value: number | string;
	onChange: (value: number | string) => void;
	/** The lowest count the buttons will step down to. Typed entry is clamped to it as well. */
	min?: number;
	max?: number;
	/** How far one press of a step button moves the value. Defaults to 1. */
	step?: number;
	required?: boolean;
	/** Shown in the input while it is empty, e.g. what leaving an optional count out means. */
	placeholder?: string;
	/**
	 * Accessible name for a button that empties the field. The button is offered only when this is
	 * set, for a count that may be left out, and only while the field has a value to clear.
	 */
	clearLabel?: string;
	/** Optional helper text shown under the label, e.g. clarifying what to include in the count. */
	hint?: string;
	/** What is wrong with the current value, shown under the field. Marks the input invalid. */
	error?: string;
	/** Accessible name for the step-down button, which shows only a glyph. */
	decrementLabel: string;
	/** Accessible name for the step-up button. */
	incrementLabel: string;
};

/** The design system's control height, shared with the outlined inputs and the buttons beside it. */
const controlSize = 58;

const Field = styled.div`
	display: grid;
	gap: 8px;
	color: var(--color-text);

	/* The label's own bottom margin would compound with this grid's gap. */
	> label {
		margin-bottom: 0;
	}
`;

const Hint = styled.p`
	margin: -4px 0 0;
	color: var(--color-text-muted);
	font-size: 14px;
	line-height: 1.5;
`;

const ErrorText = styled.p`
	margin: -2px 0 0;
	color: var(--color-error);
	font-size: 14px;
	line-height: 1.4;
`;

/**
 * One control under one outline: the step buttons and the number share a border, split by
 * hairlines, so the three read as a single field rather than three boxes. The grid mirrors on its
 * own under `dir="rtl"`, and the logical border properties follow it.
 */
const Group = styled(NumberField.Group)`
	display: grid;
	grid-template-columns: ${controlSize}px minmax(0, 1fr) ${controlSize}px;
	box-sizing: border-box;
	height: ${controlSize}px;
	overflow: hidden;
	border: 2px solid var(--color-border);
	border-radius: var(--radius-md);
	background: var(--color-background);

	&:focus-within {
		border-color: var(--color-brand);
	}

	&[data-error] {
		border-color: var(--color-error);
	}

	/* The ring goes round the whole control for the number; a step button draws its own, inside. */
	&:has(input:focus-visible) {
		outline: 3px solid var(--color-focus);
		outline-offset: 2px;
	}
`;

const StepButton = styled(Button)`
	min-width: 0;
	height: 100%;
	padding: 0;
	border-radius: 0;
	color: var(--color-brand);
	background: var(--color-surface-soft);

	&:first-of-type {
		border-inline-end: 1px solid var(--color-border-soft);
	}

	&:last-of-type {
		border-inline-start: 1px solid var(--color-border-soft);
	}

	&:hover {
		background: var(--color-surface-strong);
	}

	/* Clipped by the group's rounded corners if drawn outside, so it is drawn inside. */
	&:focus-visible,
	&.Mui-focusVisible {
		outline: 3px solid var(--color-focus);
		outline-offset: -3px;
	}

	/* Reached at the ends of the range, where the button stays visible but stops being an action. */
	&.Mui-disabled {
		color: var(--color-text-subtle);
		background: var(--color-surface-muted);
	}
`;

const SpinnerInput = styled(OutlinedInput)`
	min-width: 0;
	height: 100%;
	border-radius: 0;
	background: transparent;

	/* The group draws the border and the focus ring; the input's own would double them. */
	&:has(:focus-visible) {
		outline: 0;
	}

	.MuiOutlinedInput-notchedOutline {
		border: 0;
	}

	input {
		padding: 0 8px;
		font-size: 24px;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		text-align: center;
	}

	input::placeholder {
		font-size: 16px;
		font-weight: 400;
	}

	input::selection {
		color: var(--color-text);
		background: var(--color-brand-light);
	}
`;

/** The form keeps an unanswered count as `''`, where Base UI spells the same absence `null`. */
function toNumericValue(value: number | string): number | null {
	if (value === '') {
		return null;
	}

	const parsed = Number(value);

	return Number.isFinite(parsed) ? parsed : null;
}

/**
 * A labelled count with a step-down and step-up button either side of the number itself — MUI's
 * number spinner, which is Base UI's `NumberField` wearing this app's input and buttons.
 *
 * Typing works as well as stepping: the field takes digits directly and clamps them to `min` and
 * `max` on the way out, so a large household is a few keystrokes rather than a long press. It is a
 * plain `type="text"` input under `inputMode="numeric"` rather than `type="number"`, which is what
 * lets it reject stray characters instead of silently accepting them. How typing behaves — select
 * on focus, no leading zeros, a blank put back — is `useCountEntry`.
 */
export function NumberSpinner({
	label,
	disabled,
	value,
	onChange,
	min,
	max,
	step,
	required = false,
	placeholder,
	clearLabel,
	hint,
	error,
	decrementLabel,
	incrementLabel,
}: NumberSpinnerProps) {
	const inputId = useId();
	const labelId = useId();
	const errorId = useId();
	const numericValue = toNumericValue(value);
	const entry = useCountEntry(numericValue, onChange);

	return (
		<NumberField.Root
			disabled={disabled}
			value={numericValue}
			min={min}
			max={max}
			step={step}
			required={required}
			// Reported back in the form's own vocabulary, so the store and `GuestFormState` keep
			// holding `number | ''` and neither has to learn about Base UI.
			onValueChange={(next) => onChange(next ?? '')}
			onValueCommitted={entry.onValueCommitted}
			render={(props) => (
				<Field ref={props.ref} className="number-spinner">
					{props.children}
				</Field>
			)}
		>
			{/* `required` is deliberately left off the label, matching text fields: the control
			    carries it for validation, and the design marks required fields by their copy
			    rather than an asterisk. */}
			<FormLabel id={labelId} htmlFor={inputId}>
				{label}
			</FormLabel>
			{hint ? <Hint className="number-spinner-hint">{hint}</Hint> : null}
			{/* Named after the field, because the two buttons are not: a form asking for three
			    separate counts would otherwise offer three identical "decrease" buttons with
			    nothing to tell them apart. */}
			<Group
				className="number-spinner-group"
				aria-labelledby={labelId}
				data-error={error ? '' : undefined}
			>
				<NumberField.Decrement render={<StepButton variant="text" aria-label={decrementLabel} />}>
					<StepGlyph direction="down" />
				</NumberField.Decrement>
				<NumberField.Input
					id={inputId}
					render={(props, state) => (
						<SpinnerInput
							className="number-spinner-input"
							// `InputBase` overwrites four of the props it is handed: the input's `ref`,
							// and its `onFocus`, `onBlur`, and `onChange`, which it wraps in handlers of
							// its own. Those four have to arrive by the props that compose them back in,
							// or Base UI never hears about a keystroke. Everything else it leaves alone,
							// so the rest — `onKeyDown`, `onPaste`, `type`, `inputMode` — rides in
							// through the slot.
							inputRef={props.ref}
							value={state.inputValue}
							onFocus={(event) => entry.onFocus(event, props.onFocus)}
							onBlur={(event) => entry.onBlur(event, props.onBlur, state.inputValue)}
							onChange={(event) => entry.onChange(event, props.onChange)}
							placeholder={placeholder}
							error={Boolean(error)}
							endAdornment={
								clearLabel && value !== '' ? (
									<InputAdornment position="end">
										<IconButton
											aria-label={clearLabel}
											edge="end"
											size="small"
											onClick={() => onChange('')}
										>
											<ClearGlyph />
										</IconButton>
									</InputAdornment>
								) : undefined
							}
							slotProps={{
								input: {
									...props,
									'aria-describedby': error ? errorId : undefined,
									onPointerDown: entry.onPointerDown,
									onMouseUp: (event) => entry.onMouseUp(event, props.onMouseUp),
								},
							}}
						/>
					)}
				/>
				<NumberField.Increment render={<StepButton variant="text" aria-label={incrementLabel} />}>
					<StepGlyph direction="up" />
				</NumberField.Increment>
			</Group>
			{error ? (
				<ErrorText id={errorId} className="number-spinner-error">
					{error}
				</ErrorText>
			) : null}
		</NumberField.Root>
	);
}
