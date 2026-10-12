/**
 * Publishes the reel to GitHub Pages: a landing page with the video, the interactive page, a
 * poster frame, and the logos, force-pushed as a single commit to the `gh-pages` branch.
 *
 *   node docs/reel/publish.mjs [--dry-run] ['Co-Authored-By: …']
 *
 * `--dry-run` assembles the site in `out/site/` to look at, without pushing.
 *
 * Run it after building, capturing, and encoding the web copy (see the README). The branch is
 * replaced on every publish rather than added to, so old renders never pile up in git history,
 * and it shares no history with `main`. The site is public.
 */
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = (path) => fileURLToPath(new URL(path, import.meta.url));
const site = here('./out/site');
/** The moment the poster frame shows: a number being called on every screen at once. */
const posterSeconds = 25.5;
const fps = 30;
const git = (args, cwd = here('../..')) =>
	execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();

const inputs = {
	page: here('./out/market-day-reel.html'),
	video: here('./out/market-day-reel-web.mp4'),
	frame: here(`./out/frames/${String(Math.round(posterSeconds * fps)).padStart(5, '0')}.jpg`),
};

for (const [name, path] of Object.entries(inputs)) {
	if (!existsSync(path)) {
		throw new Error(`Missing the ${name} (${path}); build, capture, and encode first.`);
	}
}

const remote = git(['remote', 'get-url', 'origin']);
const [, owner, repo] = remote.match(/github\.com[:/]([^/]+)\/(.+?)(?:\.git)?$/) ?? [];

if (!owner || !repo) {
	throw new Error(`Cannot tell the GitHub repository from the origin remote: ${remote}`);
}

const base = `https://${owner}.github.io/${repo}/`;

rmSync(site, { recursive: true, force: true });
mkdirSync(site, { recursive: true });
writeFileSync(
	`${site}/index.html`,
	readFileSync(here('./site.html'), 'utf8').replaceAll('__BASE__', base),
);
copyFileSync(inputs.page, `${site}/reel.html`);
copyFileSync(inputs.video, `${site}/market-day-reel.mp4`);
copyFileSync(here('../../public/wordmark.png'), `${site}/wordmark.png`);
copyFileSync(here('../../public/bay-compassion-logo.png'), `${site}/logo.png`);
execFileSync('sips', ['-Z', '1280', inputs.frame, '--out', `${site}/poster.jpg`], {
	stdio: 'ignore',
});
// Plain files only: tells Pages not to run them through Jekyll.
writeFileSync(`${site}/.nojekyll`, '');

const args = process.argv.slice(2);

if (args.includes('--dry-run')) {
	console.log(`Assembled out/site for ${base}; nothing pushed.`);
	process.exit(0);
}

const source = git(['rev-parse', '--short', 'HEAD']);

git(['init', '--quiet', '--initial-branch=gh-pages'], site);
git(['add', '--all'], site);
// Any arguments are added to the commit message as trailers, e.g. a Co-Authored-By line.
const trailers = args.flatMap((line) => ['--trailer', line]);

git(
	['commit', '--quiet', '--message', `Publish the market day reel from ${source}`, ...trailers],
	site,
);
git(['push', '--force', remote, 'gh-pages'], site);
console.log(`Pushed gh-pages; the reel will be at ${base} once Pages has deployed it.`);
