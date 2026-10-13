/**
 * Builds and assembles the GSAP presentations for GitHub Pages. The market day reel stays at
 * the root; the volunteer guide lives at /queue-desk/ and the guest guide at /guest-guide/.
 * No capture, transcoding or git push.
 *
 *   node docs/reel/publish.mjs
 *
 * GitHub Actions uploads out/site as a Pages artifact and deploys it. --dry-run remains an
 * alias for local previews; this script always assembles files without publishing them.
 */
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { translations } from '../../src/locales.ts';
import { videos } from './videos.mjs';

const here = (path) => fileURLToPath(new URL(path, import.meta.url));
const site = here('./out/site');
const git = (args) => execFileSync('git', args, { cwd: here('../..'), encoding: 'utf8' }).trim();

if (process.argv.slice(2).some((arg) => arg !== '--dry-run')) {
	throw new Error('Usage: node docs/reel/publish.mjs [--dry-run]');
}

const remote = git(['remote', 'get-url', 'origin']);
const [, owner, repo] = remote.match(/github\.com[:/]([^/]+)\/(.+?)(?:\.git)?$/) ?? [];

if (!owner || !repo) {
	throw new Error(`Cannot tell the GitHub repository from the origin remote: ${remote}`);
}

const base =
	(process.env.PAGES_BASE_URL ?? `https://${owner}.github.io/${repo}`).replace(/\/$/, '') + '/';
const source = git(['rev-parse', 'HEAD']);
const branch = git(['branch', '--show-current']) || process.env.GITHUB_REF_NAME || null;
const dirty = Boolean(git(['status', '--porcelain']));
const published = Object.entries(videos).filter(([, video]) => video.publish);

// The committed soundtracks and narration timings are the audio source in CI. Reject stale
// narration rather than publishing pictures that no longer match what the voice says.
for (const [name] of published) {
	execFileSync(process.execPath, [here('./build.mjs'), name, '--strict'], { stdio: 'inherit' });
}

const escape = (value) =>
	String(value).replace(
		/[&<>"']/g,
		(character) =>
			({
				'&': '&amp;',
				'<': '&lt;',
				'>': '&gt;',
				'"': '&quot;',
				"'": '&#39;',
			})[character],
	);
const template = readFileSync(here('./site.html'), 'utf8');
const narrationSoundKey = { en: 'sound', es: 'soundSpanish', zh: 'soundChinese' };

rmSync(site, { recursive: true, force: true });
mkdirSync(site, { recursive: true });

for (const [name, video] of published) {
	const presentation = {
		...video.publish,
		...(video.publish.guest ? translations[video.locale ?? 'en'].guestView.presentation : {}),
	};
	const destination = path.join(site, presentation.folder);

	mkdirSync(destination, { recursive: true });
	const values = {
		BASE: base + (presentation.folder ? presentation.folder + '/' : ''),
		TITLE: presentation.title,
		HEADING: presentation.heading,
		SUMMARY: presentation.summary,
		DESCRIPTION: presentation.description,
		SOUND: presentation[narrationSoundKey[video.locale ?? 'en']],
		SCREENS: presentation.screens ?? translations.en.guestView.presentation.screens,
		LOCALE: video.locale ?? 'en',
		INTERACTIVE: presentation.interactive,
		PLAYER_CLASS: presentation.guest ? 'guest-player' : '',
		OPEN: presentation.open ?? 'Open presentation',
		DOWNLOAD: presentation.download ?? 'Download presentation',
		MORE: presentation.more ?? 'More',
	};
	const links = published
		.filter(([other]) => other !== name)
		.map(([, other]) => {
			const relative =
				path.relative(presentation.folder || '.', other.publish.folder || '.') || '.';

			const title = other.publish.guest
				? translations[other.locale ?? 'en'].guestView.presentation.title
				: other.publish.title;

			return `<a href="${escape(relative + '/index.html')}">${escape(title)}</a>`;
		})
		.join('\n');
	const page = template.replace(/__([A-Z]+(?:_[A-Z]+)*)__/g, (token, key) => {
		if (key === 'OTHER_VIDEOS') {
			return links;
		}

		if (!(key in values)) {
			throw new Error(`Unknown site placeholder: ${token}`);
		}

		return escape(values[key]);
	});

	writeFileSync(path.join(destination, 'index.html'), page);
	copyFileSync(here(`./out/${name}.html`), path.join(destination, presentation.interactive));
	copyFileSync(here('../../public/wordmark.png'), path.join(destination, 'wordmark.png'));
	copyFileSync(here('../../public/bay-compassion-logo.png'), path.join(destination, 'logo.png'));
}

writeFileSync(`${site}/.nojekyll`, '');
writeFileSync(
	`${site}/source.json`,
	JSON.stringify(
		{
			commit: source,
			branch,
			dirty,
			url: `https://github.com/${owner}/${repo}/commit/${source}`,
		},
		null,
		2,
	) + '\n',
);
console.log(
	`Assembled out/site for ${base}; no files pushed.${dirty ? ' Source changes are uncommitted.' : ''}`,
);
