/** The same logo-and-type composition used by the React and static document headers. */
import { readFileSync } from 'node:fs';

export const brandCss = readFileSync(
	new URL('../../src/styles/brand.css', import.meta.url),
	'utf8',
);

export function brandLockup(icon: string): string {
	return `<span class="brand-lockup wordmark" role="img" aria-label="The Bay Compassion">
		<img class="brand-lockup__icon" src="${icon}" alt="">
		<span class="brand-lockup__name" aria-hidden="true"><span>The Bay</span><span>Compassion</span></span>
	</span>`;
}
