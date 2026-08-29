import type { DOMWrapper } from '@vue/test-utils';

const nativeInputValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');

/**
 * Types a value into an input that React controls, from a Vue component test.
 *
 * `@vue/test-utils`' own `setValue` assigns straight to `element.value`. React installs its own
 * setter on `HTMLInputElement.prototype` and uses it to remember the current value, so a direct
 * assignment updates that record too — and the `input` event that follows then looks like a
 * no-op, leaving `onChange` unfired and the model unchanged. Calling the *native* setter leaves
 * React's record stale, which is what makes the event read as a real edit.
 *
 * `<select>` needs none of this; React only tracks input elements this way.
 *
 * Only needed while Vue components render React inputs. It goes with the rest of `react-bridge`.
 */
export async function setReactInputValue(field: DOMWrapper<Element>, value: string): Promise<void> {
	const element = field.element as HTMLInputElement;

	nativeInputValue?.set?.call(element, value);
	await field.trigger('input');
}
