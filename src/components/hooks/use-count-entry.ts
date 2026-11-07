import {
	type ChangeEvent,
	type ChangeEventHandler,
	type FocusEvent,
	type FocusEventHandler,
	type MouseEvent,
	type MouseEventHandler,
	type PointerEvent,
	useRef,
} from 'react';

/** MUI types its input's events for either element, since the same component renders a textarea. */
type TextControl = HTMLInputElement | HTMLTextAreaElement;

/** Zeros ahead of another digit, in Western, Arabic-Indic, and Persian numerals. A lone 0 stays. */
const leadingZeros = /^[0٠۰]+(?=\p{Nd})/u;

/** `"007"` becomes `"7"`; `"0"` and `""` are left alone. */
export function trimLeadingZeros(text: string): string {
	return text.replace(leadingZeros, '');
}

/**
 * How a typed count behaves, layered over the handlers Base UI's `NumberField.Input` already owns.
 *
 * - **Select all on focus.** Tapping the number selects it, so the first digit typed replaces the
 *   count rather than landing beside it — "3" then "2" is 2, not 32.
 * - **Trim leading zeros as they are typed**, so the field never shows "007".
 * - **Revert when left blank.** Erasing the number and leaving the field puts back the count it
 *   held, so a required count is not emptied by accident. A count that was never answered stays
 *   blank; the spinner's clear button is the deliberate way to empty an optional one.
 *
 * Each `on…` takes Base UI's own handler and runs it first, so its parsing, clamping, and
 * formatting are untouched.
 */
export function useCountEntry(value: number | null, onRevert: (value: number) => void) {
	/** The count to put back if the field is left blank: the value it held when focused. */
	const restoreTo = useRef<number | null>(null);
	/** Whether this press is the one focusing the field, whose `mouseup` would drop the selection. */
	const focusingPress = useRef(false);

	return {
		/** Keeps the restore point current when a commit happens without leaving the field (arrows). */
		onValueCommitted: (next: number | null) => {
			if (next !== null) {
				restoreTo.current = next;
			}
		},

		onPointerDown: (event: PointerEvent<TextControl>) => {
			focusingPress.current = document.activeElement !== event.currentTarget;
		},

		/**
		 * The press that focuses the field places a caret of its own after the focus event, which
		 * would undo the selection made there; it is selected again as the press ends, and the
		 * `mouseup`'s own caret placement held back. Later taps still move the caret.
		 */
		onMouseUp: (event: MouseEvent<TextControl>, base?: MouseEventHandler<TextControl>) => {
			base?.(event);

			if (focusingPress.current) {
				focusingPress.current = false;
				event.preventDefault();
				event.currentTarget.select();
			}
		},

		onFocus: (event: FocusEvent<TextControl>, base?: FocusEventHandler<TextControl>) => {
			base?.(event);
			restoreTo.current = value;

			// Enough for keyboard focus. A tap or click undoes it, so `onMouseUp` selects again.
			event.currentTarget.select();
		},

		/**
		 * The trimmed text is written back to the element before Base UI reads it, so Base UI sees
		 * only the text the field will show. The caret lands at the end, where it was while typing.
		 */
		onChange: (event: ChangeEvent<TextControl>, base?: ChangeEventHandler<TextControl>) => {
			const input = event.currentTarget;
			const trimmed = trimLeadingZeros(input.value);

			if (trimmed !== input.value) {
				input.value = trimmed;
			}

			base?.(event);
		},

		/**
		 * Base UI commits the blank first (reporting it as `null`); the restored count is reported
		 * after it, so it is the value the form is left holding.
		 */
		onBlur: (
			event: FocusEvent<TextControl>,
			base: FocusEventHandler<TextControl> | undefined,
			text: string,
		) => {
			base?.(event);

			if (text.trim() === '' && restoreTo.current !== null) {
				onRevert(restoreTo.current);
			}
		},
	};
}
