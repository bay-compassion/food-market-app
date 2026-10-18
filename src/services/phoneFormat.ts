/**
 * Formats a US phone number into `(555) 123-4567` as the guest types, one digit at a time.
 *
 * Non-digit characters (parens, dashes, spaces the mask itself already added) are stripped and
 * re-added, so this is safe to call on every keystroke with the field's current text. A leading
 * `1` is dropped: no US area code starts with 1, so it can only be a country code someone typed or
 * pasted ahead of the number, and keeping it would push every later digit out of place.
 */
export function formatUsPhone(value: string): string {
	const digits = value.replace(/\D/g, '').replace(/^1/, '').slice(0, 10);

	const areaCode = digits.slice(0, 3);
	const exchange = digits.slice(3, 6);
	const line = digits.slice(6, 10);

	if (digits.length > 6) {
		return `(${areaCode}) ${exchange}-${line}`;
	}

	if (digits.length > 3) {
		return `(${areaCode}) ${exchange}`;
	}

	if (digits.length > 0) {
		return `(${areaCode}`;
	}

	return '';
}

/**
 * A phone number in the one form the database compares by: `+` and its digits, with a ten-digit US
 * number given its `1`. Shared by the server, which stores it as `normalized_phone`, and the
 * browser, which checks a typed confirmation against a guest's number before the server does.
 */
export function normalizePhone(phone: string): string {
	const digits = phone.replace(/\D/g, '');

	return `+${digits.length === 10 ? `1${digits}` : digits}`;
}

/** Whether `typed` is the same phone number as `onFile`, however either is punctuated. */
export function isSamePhone(typed: string, onFile: string): boolean {
	return /\d/.test(typed) && normalizePhone(typed) === normalizePhone(onFile);
}
