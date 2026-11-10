// Packages the built app (`out/`, from `electron-vite build`) as Check-In.app, and zips it for
// copying to the iMac. `pnpm build` runs both steps.
//
//   node package.ts            # universal: Intel and Apple Silicon
//   node package.ts arm64      # one architecture, half the size
//
// The Electron release is the `electron` devDependency's. Keep it supported: the app holds a
// signed-in session with guest names and phone numbers, so it should get Chromium's security fixes.

import { execFileSync } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

import { packager } from '@electron/packager';

const here = import.meta.dirname;
const release = path.join(here, 'release');
const architectures = ['universal', 'arm64', 'x64'] as const;
const arch = architectures.find((name) => name === process.argv[2]) ?? 'universal';

const electronManifest = createRequire(import.meta.url).resolve('electron/package.json');
const { version: electronVersion } = JSON.parse(readFileSync(electronManifest, 'utf8')) as {
	version: string;
};

// Only the manifest and the compiled main process go in; the sources, the tooling, and
// node_modules (the app has no runtime dependencies) stay out.
const shipped = (file: string) =>
	file === '' || file === '/package.json' || file === '/out' || file.startsWith('/out/');

const [appDirectory] = await packager({
	dir: here,
	out: release,
	name: 'Check-In',
	platform: 'darwin',
	arch,
	electronVersion,
	appBundleId: 'org.thebaycompassion.check-in',
	appCategoryType: 'public.app-category.productivity',
	icon: path.join(here, '../../docs/check-in-launcher/icon.icns'),
	asar: true,
	overwrite: true,
	prune: false,
	ignore: (file) => !shipped(file),
});

if (!appDirectory) {
	throw new Error('Packager produced no app');
}

const app = path.join(appDirectory, 'Check-In.app');

// Packaging edits the bundle, which breaks Electron's own signature, and a broken signature is
// refused outright. Ad hoc signing has no identity behind it, so Gatekeeper still asks once: the
// first time, right-click the app and choose Open.
execFileSync('codesign', ['--force', '--deep', '--sign', '-', app], { stdio: 'inherit' });
execFileSync('codesign', ['--verify', '--deep', '--strict', app], { stdio: 'inherit' });

// ditto keeps the framework symlinks a plain zip would turn into copies.
const zip = path.join(release, `Check-In-${arch}.zip`);

rmSync(zip, { force: true });
execFileSync('ditto', ['-c', '-k', '--keepParent', app, zip]);

console.log(`Built ${app}\nZipped ${zip}`);
