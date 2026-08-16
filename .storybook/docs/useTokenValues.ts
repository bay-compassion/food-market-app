import { onMounted, ref, type Ref } from 'vue';

/**
 * Reads the live value of CSS custom properties off the document root.
 *
 * This is what keeps the design system pages honest: `src/styles/base.css` stays the single source
 * of truth and the documentation reports whatever is actually defined there, rather than repeating
 * values in prose that quietly go stale. It has to run after mount, because the values come from
 * the rendered document rather than from anything importable.
 */
export function useTokenValues(tokens: string[]): Ref<Record<string, string>> {
	const values = ref<Record<string, string>>({});

	onMounted(() => {
		const styles = getComputedStyle(document.documentElement);

		values.value = Object.fromEntries(
			tokens.map((token) => [token, styles.getPropertyValue(token).trim()]),
		);
	});

	return values;
}
