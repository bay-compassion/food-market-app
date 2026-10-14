/** Keep standalone presentation pages independent of the app's public asset server. */
import { readFileSync } from 'node:fs';

const directory = new URL('../../public/fonts/', import.meta.url);

export const brandFontCss = readFileSync(new URL('brand.css', directory), 'utf8').replace(
	/url\('\/fonts\/([\w-]+\.woff2)'\)/g,
	(_match, name: string) =>
		`url('data:font/woff2;base64,${readFileSync(new URL(name, directory)).toString('base64')}')`,
);
