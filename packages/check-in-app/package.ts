// Packages the built app (`out/`, from `electron-vite build`) as Compassion Food Market.app, signs
// it, and zips it with the `latest-mac.yml` an installed app reads to find it as an update.
// `pnpm build` runs both steps; `.github/workflows/release-desktop-app.yml` publishes the result.
//
//   node package.ts            # universal: Intel and Apple Silicon
//   node package.ts arm64      # one architecture, half the size
//
// Signing (see the README's "Signing"):
//   SIGNING_IDENTITY   the certificate's name or SHA-1. Without it the app is signed ad hoc, which
//                      runs but can neither install an update nor be installed as one.
//   SIGNING_KEYCHAIN   the keychain holding it, if not the default ones.
//   REQUIRE_SIGNING=1  fail instead of falling back to ad hoc, as a release does.
//
// The Electron release is the `electron` devDependency's. Keep it supported: the app holds a
// signed-in session with guest names and phone numbers, so it should get Chromium's security fixes.

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

import { packager } from '@electron/packager';

const here = import.meta.dirname;
const name = 'Compassion Food Market';
const release = path.join(here, 'release');
const architectures = ['universal', 'arm64', 'x64'] as const;
const arch = architectures.find((option) => option === process.argv[2]) ?? 'universal';

const { version } = JSON.parse(readFileSync(path.join(here, 'package.json'), 'utf8')) as {
	version: string;
};
const electronManifest = createRequire(import.meta.url).resolve('electron/package.json');
const { version: electronVersion } = JSON.parse(readFileSync(electronManifest, 'utf8')) as {
	version: string;
};

const identity = process.env.SIGNING_IDENTITY || null;
const keychain = process.env.SIGNING_KEYCHAIN || null;

if (!identity && process.env.REQUIRE_SIGNING === '1') {
	throw new Error('REQUIRE_SIGNING is set but SIGNING_IDENTITY is not');
}

// Only the manifest, the build, and the settings go in; the sources, the tooling, and node_modules
// (everything the app uses is bundled) stay out, and so do one machine's `config/local*.json`.
const shipped = (file: string) =>
	file === '' ||
	file === '/package.json' ||
	['/out', '/config'].some((folder) => file === folder || file.startsWith(`${folder}/`));
const personal = (file: string) => /^\/config\/local[^/]*\.json$/.test(file);

// electron-updater reads this from the app's Resources even though the app sets its feed itself
// (src/main/updates.ts): it names the folder downloads wait in. The repository is the one
// config/default.json names, so the two can't drift apart.
const { updates } = JSON.parse(readFileSync(path.join(here, 'config/default.json'), 'utf8')) as {
	updates: { owner: string; repo: string };
};
const updaterSettings = path.join(release, 'app-update.yml');

mkdirSync(release, { recursive: true });
writeFileSync(
	updaterSettings,
	[
		'provider: github',
		`owner: ${updates.owner}`,
		`repo: ${updates.repo}`,
		'updaterCacheDirName: compassion-food-market-updater',
		'',
	].join('\n'),
);

const [appDirectory] = await packager({
	dir: here,
	out: release,
	name,
	platform: 'darwin',
	arch,
	electronVersion,
	// The bundle ID and the certificate are what macOS checks an update against: changing either
	// strands every installed copy, which then has to be replaced by hand once.
	appBundleId: 'org.thebaycompassion.food-market',
	appCategoryType: 'public.app-category.productivity',
	// From `pnpm icon` (icon/make-icon.ts).
	icon: path.join(here, 'resources/icon.icns'),
	asar: true,
	overwrite: true,
	prune: false,
	ignore: (file) => !shipped(file) || personal(file),
	extraResource: [updaterSettings],
});

if (!appDirectory) {
	throw new Error('Packager produced no app');
}

const app = path.join(appDirectory, `${name}.app`);

// Packaging edits the bundle, which breaks Electron's own signature, so it is signed again: with the
// release certificate when there is one, so that its designated requirement names the certificate
// rather than this one build, which is what lets the next release replace it.
execFileSync(
	'codesign',
	[
		'--force',
		'--deep',
		'--sign',
		identity ?? '-',
		...(keychain ? ['--keychain', keychain] : []),
		app,
	],
	{ stdio: 'inherit' },
);
execFileSync('codesign', ['--verify', '--deep', '--strict', app], { stdio: 'inherit' });

const requirement = execFileSync('codesign', ['-d', '-r-', app], {
	encoding: 'utf8',
	stdio: ['ignore', 'pipe', 'pipe'],
});

// A certificate's hash (`certificate leaf` or, for a self-signed one, `certificate root`), not the
// `cdhash` of this one build that ad hoc signing pins.
if (identity && !/certificate (?:leaf|root) = H"/.test(requirement)) {
	throw new Error(`Signed, but not by a certificate:\n${requirement}`);
}

// The release's files, named by version so a release can hold more than one. ditto keeps the
// framework symlinks a plain zip would turn into copies. The name carries no "arm64", which the
// updater would take to mean Apple Silicon only.
const zipName = `${name.replaceAll(' ', '-')}-${version}-${arch}-mac.zip`;
const zip = path.join(release, zipName);

rmSync(zip, { force: true });
execFileSync('ditto', ['-c', '-k', '--keepParent', app, zip]);

// What electron-updater reads from the latest release to decide whether, and what, to download.
const sha512 = createHash('sha512').update(readFileSync(zip)).digest('base64');
const size = statSync(zip).size;
const manifest = [
	`version: ${version}`,
	'files:',
	`  - url: ${zipName}`,
	`    sha512: ${sha512}`,
	`    size: ${size}`,
	`path: ${zipName}`,
	`sha512: ${sha512}`,
	`releaseDate: '${new Date().toISOString()}'`,
	'',
].join('\n');

writeFileSync(path.join(release, 'latest-mac.yml'), manifest);

console.log(
	[
		`Built ${app} ${version} (${identity ? `signed by ${identity}` : 'signed ad hoc: it cannot update'})`,
		`Zipped ${zip}`,
		`Wrote ${path.join(release, 'latest-mac.yml')}`,
	].join('\n'),
);
