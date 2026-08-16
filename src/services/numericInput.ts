/** Parses a number input's raw string value, keeping the empty string so a field can appear blank
 *  rather than becoming `0` or `NaN` while the guest is still typing. */
export function parseNumericInput(value: string): number | string {
	const parsed = Number.parseFloat(value);

	return Number.isNaN(parsed) ? value : parsed;
}
