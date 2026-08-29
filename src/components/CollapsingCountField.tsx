import styled from '@emotion/styled';
import { useId, useState, type ChangeEvent } from 'react';

import { parseNumericInput } from '../services/numericInput';

export type CollapsingCountFieldProps = {
	label: string;
	value: number | string;
	onChange: (value: number | string) => void;
	/** The quick-select counts shown as buttons, in order. */
	options?: number[];
	required?: boolean;
	max?: number;
	/** Accessible name for the number field, since it has no visible label of its own. */
	otherLabel: string;
	/**
	 * Placeholder shown once the number field is focused and doesn't hold a value yet. Distinct
	 * from the collapsed "n+" placeholder, which stays a plain boundary number.
	 */
	otherPlaceholder: string;
	/** Accessible name for the button that collapses the number field back into buttons. */
	backLabel: string;
	/** Optional helper text shown under the label, e.g. clarifying what to include in the count. */
	hint?: string;
};

const buttonSize = 58;
const buttonGap = 8;

/** Matches `.count-option`'s own width — the size the column settles at once only "<n" is left. */
const backWidth = `${buttonSize}px`;

const Field = styled.div`
	display: grid;
	gap: 8px;
	color: var(--color-text);

	> span {
		font-family: var(--font-heading);
		font-size: 16px;
		font-weight: 700;
	}
`;

const Hint = styled.p`
	margin: -4px 0 0;
	color: var(--color-text-muted);
	font-size: 14px;
	line-height: 1.5;
`;

/**
 * The column holding the buttons animates between its full width and `backWidth` rather than
 * jumping, which is why the expanded width is computed rather than a fixed track.
 */
const Options = styled.div<{ $buttonsWidth: string; $expanded: boolean }>`
	position: relative;
	display: grid;
	grid-template-columns:
		${({ $expanded, $buttonsWidth }) => ($expanded ? backWidth : $buttonsWidth)}
		1fr;
	gap: 8px;
	transition: grid-template-columns 0.32s ease;
`;

const Buttons = styled.div`
	display: flex;
	gap: 8px;
	overflow: hidden;
`;

const countOption = `
	height: 58px;
	min-width: 58px;
	padding: 0 12px;
	color: var(--color-text);
	font-family: var(--font-body);
	font-size: 16px;
	font-weight: 700;
	text-align: center;
	border: 2px solid var(--color-border);
	border-radius: var(--radius-md);
	outline: 0;
	background: var(--color-background);
`;

const OptionButton = styled.button<{ $active?: boolean }>`
	${countOption}

	${({ $active }) =>
		$active
			? `
	color: var(--color-on-brand);
	border-color: var(--color-brand);
	background: var(--color-brand);
`
			: ''}
`;

const OtherInput = styled.input`
	${countOption}
	min-width: 0;
	font-weight: 400;

	&::placeholder {
		color: var(--color-placeholder);
	}
`;

/**
 * Carries `required` so the browser's validation bubble anchors to the whole control rather than
 * whichever narrow shape the real input happens to be. `opacity: 0` keeps it rendered and
 * focusable — `display: none`/`visibility: hidden` would make Chrome treat it as unfocusable and
 * block submission with no visible message at all.
 */
const ValidityAnchor = styled.input`
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
	opacity: 0;
	pointer-events: none;
`;

/**
 * A count field whose quick-select buttons collapse into a single "<n" button the moment the
 * number field is focused, and expand back the moment it gives up a value the buttons can't
 * represent.
 *
 * Focusing the number field never fills it with whatever button was already active — it stays
 * blank with an "enter a value" placeholder, and if it's left that way, blurring collapses back
 * onto that same still-active button rather than clearing anything. Going the other way — pressing
 * "<n" once a value the buttons don't offer has actually been typed — doesn't discard it either:
 * it lands on the greatest button instead, the closest the buttons can represent. The number field
 * is never removed from the DOM, only the buttons are, so it never loses focus across the swap.
 *
 * The number field's own `min` is pinned to the first value past the buttons rather than taking a
 * `min` prop: the buttons already cover everything below that.
 */
export function CollapsingCountField({
	label,
	value,
	onChange,
	options = [0, 1, 2, 3],
	required = false,
	max,
	otherLabel,
	otherPlaceholder,
	backLabel,
	hint,
}: CollapsingCountFieldProps) {
	const labelId = useId();
	const [focused, setFocused] = useState(false);
	/**
	 * What the number field shows while it is the one being typed into. Reading straight from
	 * `value` would work most of the time, but the moment a partial entry matches a button —
	 * typing "1" on the way to "12" — it counts as non-custom for that one keystroke and the field
	 * would flash blank.
	 */
	const [draftValue, setDraftValue] = useState('');

	const buttonsWidth = `${options.length * buttonSize + (options.length - 1) * buttonGap}px`;
	/** The first value the buttons don't offer — what the number field is for. */
	const boundary = Math.max(...options) + 1;
	const isCustomValue = value !== '' && !options.includes(Number(value));
	/** Whether the number field, not the buttons, is currently how the count is being set. */
	const showExpanded = focused || isCustomValue;
	const displayValue = focused ? draftValue : isCustomValue ? value : '';

	const isActive = (option: number) => value !== '' && Number(value) === option;

	function handleFocus() {
		setFocused(true);
		setDraftValue(isCustomValue ? String(value) : '');
	}

	function handleOtherInput(event: ChangeEvent<HTMLInputElement>) {
		setDraftValue(event.target.value);
		onChange(parseNumericInput(event.target.value));
	}

	/**
	 * Blurring the number field — which a click on this button does first — already drops back to
	 * the buttons when the value is one they can show as active. A custom value has no button to
	 * land on, so going back lands it on the greatest one instead.
	 */
	function handleBack() {
		if (isCustomValue) {
			onChange(boundary - 1);
		}
	}

	return (
		<Field className="count-field">
			<span id={labelId}>{label}</span>
			{hint ? <Hint className="count-hint">{hint}</Hint> : null}
			<Options
				className={`count-options${showExpanded ? ' expanded' : ''}`}
				$buttonsWidth={buttonsWidth}
				$expanded={showExpanded}
				role="group"
				aria-labelledby={labelId}
			>
				<Buttons className="count-buttons">
					{showExpanded ? (
						<OptionButton
							type="button"
							className="count-option count-back"
							aria-label={backLabel}
							onClick={handleBack}
						>
							{`<${boundary}`}
						</OptionButton>
					) : (
						options.map((option) => (
							<OptionButton
								key={option}
								type="button"
								className="count-option"
								$active={isActive(option)}
								aria-pressed={isActive(option)}
								onClick={() => onChange(option)}
							>
								{option}
							</OptionButton>
						))
					)}
				</Buttons>
				<OtherInput
					className="count-option count-other"
					type="number"
					aria-label={otherLabel}
					value={displayValue}
					min={boundary}
					max={max}
					inputMode="numeric"
					placeholder={showExpanded ? otherPlaceholder : `${boundary}+`}
					onChange={handleOtherInput}
					onFocus={handleFocus}
					onBlur={() => setFocused(false)}
				/>
				<ValidityAnchor
					className="count-validity-anchor"
					type="text"
					tabIndex={-1}
					aria-label={label}
					value={value}
					required={required}
					// `readOnly` — React's other way to silence the controlled-input warning — would
					// exempt this from constraint validation entirely, which is the one thing it exists
					// for. It takes no user input either way: it is `pointer-events: none` and out of
					// the tab order, so this handler never runs.
					onChange={() => {}}
				/>
			</Options>
		</Field>
	);
}
