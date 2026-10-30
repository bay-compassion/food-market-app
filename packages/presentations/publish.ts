/**
 * Builds and assembles the GSAP presentations for GitHub Pages. The portfolio lives at the root;
 * every presentation has a page under /presentations/.
 * No capture, transcoding or git push.
 *
 *   node packages/presentations/publish.ts
 *
 * GitHub Actions uploads out/site as a Pages artifact and deploys it. --dry-run remains an
 * alias for local previews; this script always assembles files without publishing them.
 */
import { execFileSync } from 'node:child_process';
import { copyFileSync, cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { translations } from '../../src/locales.ts';
import { brandCss, brandLockup } from './branding.ts';
import { brandFontCss } from './fonts.ts';
import { allVideos } from './videos.ts';

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url));
const site = here('./out/site');
const git = (args: string[]) =>
	execFileSync('git', args, { cwd: here('../..'), encoding: 'utf8' }).trim();

if (process.argv.slice(2).some((arg) => arg !== '--dry-run')) {
	throw new Error('Usage: node packages/presentations/publish.ts [--dry-run]');
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
const published = allVideos();

// The committed soundtracks and narration timings are the audio source in CI. Reject stale
// narration rather than publishing pictures that no longer match what the voice says.
for (const { name } of published) {
	execFileSync(process.execPath, [here('./build.ts'), name, '--strict'], { stdio: 'inherit' });
}

const escape = (value: unknown) =>
	String(value).replace(
		/[&<>"']/g,
		(character) =>
			({
				'&': '&amp;',
				'<': '&lt;',
				'>': '&gt;',
				'"': '&quot;',
				"'": '&#39;',
			})[character] ?? character,
	);
const repository = `https://github.com/${owner}/${repo}`;
const template = readFileSync(here('./site.html'), 'utf8')
	.replace('__FONT_CSS__', brandFontCss + brandCss)
	.replace('__BRAND_LOCKUP__', () => brandLockup('logo.svg'));

rmSync(site, { recursive: true, force: true });
mkdirSync(site, { recursive: true });

for (const video of published) {
	const presentation = {
		...video.publish,
		...(video.publish.guest ? translations.en.guestView.presentation : {}),
	};
	const destination = path.join(site, presentation.folder);

	mkdirSync(destination, { recursive: true });
	const values: Record<string, string | undefined> = {
		HOME: '../../',
		BASE: base + (presentation.folder ? presentation.folder + '/' : ''),
		TITLE: presentation.title,
		HEADING: presentation.heading,
		SUMMARY: presentation.summary,
		DESCRIPTION: presentation.description,
		SOUND: presentation.sound,
		SCREENS:
			presentation.screens ??
			'The screens are simplified recreations of the real app, with fictional guests.',
		INTERACTIVE: presentation.interactive,
		// A guide that turns portrait on a phone, as the guest and dashboard guides do.
		PLAYER_CLASS: [presentation.guest && 'guest-player', presentation.portrait && 'portrait-player']
			.filter(Boolean)
			.join(' '),
		OPEN: presentation.open ?? 'Open Presentation',
		DOWNLOAD: presentation.download ?? 'Download Presentation',
		MORE: presentation.more ?? 'More',
	};
	const links = published
		.filter((other) => other.name !== video.name)
		.map((other) => {
			const relative =
				path.relative(presentation.folder || '.', other.publish.folder || '.') || '.';

			const title = other.publish.guest
				? translations.en.guestView.presentation.title
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
	copyFileSync(here(`./out/${video.name}.html`), path.join(destination, presentation.interactive));
	copyFileSync(
		here('../../public/bay-compassion-icon-digital.svg'),
		path.join(destination, 'logo.svg'),
	);
	copyFileSync(here('../../public/bay-compassion-logo.png'), path.join(destination, 'logo.png'));
}

const portfolio = readFileSync(here('./portfolio/index.html'), 'utf8')
	.replaceAll('__BASE__', escape(base))
	.replaceAll('__REPO__', escape(repository))
	.replace('__FONT_CSS__', brandFontCss + brandCss)
	.replace('__BRAND_LOCKUP__', () => brandLockup('logo.svg'));

writeFileSync(path.join(site, 'index.html'), portfolio);
cpSync(here('../../public/fonts'), path.join(site, 'fonts'), { recursive: true });
copyFileSync(here('./portfolio/portfolio.css'), path.join(site, 'portfolio.css'));
copyFileSync(here('../../public/bay-compassion-icon-digital.svg'), path.join(site, 'logo.svg'));
copyFileSync(here('../../public/bay-compassion-logo.png'), path.join(site, 'logo.png'));
cpSync(here('../../docs/images/portfolio'), path.join(site, 'images'), { recursive: true });

// Preserve links already shared from the original presentations site.
for (const [oldPath, destination] of [
	['guest-guide/index.html', '../presentations/guest-guide/index.html'],
	['queue-desk/index.html', '../presentations/queue-desk/index.html'],
	['guest-guide/guest-guide.html', '../presentations/guest-guide/guest-guide.html'],
	['queue-desk/queue-desk.html', '../presentations/queue-desk/queue-desk.html'],
	['reel.html', 'presentations/market-day-reel/reel.html'],
] as const) {
	const target = path.join(site, oldPath);

	mkdirSync(path.dirname(target), { recursive: true });

	writeFileSync(
		target,
		`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=${escape(destination)}"><title>Presentation moved</title></head><body><a href="${escape(destination)}">Continue to the presentation</a></body></html>`,
	);
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
