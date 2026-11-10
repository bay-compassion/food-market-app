// Regenerates the app's icon from the logo in `public/`: `resources/icon.png`, which development puts
// in the Dock, and `resources/icon.icns`, which the packaged app carries. Both are committed, so
// building needs no Swift; run this, on a Mac with the Xcode command line tools, after the logo
// changes.
//
//   pnpm --filter @bay-compassion/check-in-app icon

import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const here = import.meta.dirname;
const logo = path.join(here, '../../../public/bay-compassion-icon-digital.svg');
const resources = path.join(here, '../resources');
const work = mkdtempSync(path.join(tmpdir(), 'app-icon-'));

try {
	const png = path.join(work, 'icon-1024.png');

	execFileSync('swift', [path.join(here, 'render-icon.swift'), logo, png], { stdio: 'inherit' });

	// Every size macOS asks an icon for, at 1× and 2×.
	const iconset = path.join(work, 'icon.iconset');

	mkdirSync(iconset);

	for (const size of [16, 32, 128, 256, 512]) {
		for (const [scale, suffix] of [
			[1, ''],
			[2, '@2x'],
		] as const) {
			const pixels = String(size * scale);
			const file = path.join(iconset, `icon_${size}x${size}${suffix}.png`);

			execFileSync('sips', ['-z', pixels, pixels, png, '--out', file], { stdio: 'ignore' });
		}
	}

	mkdirSync(resources, { recursive: true });
	execFileSync('iconutil', ['-c', 'icns', '-o', path.join(resources, 'icon.icns'), iconset]);
	copyFileSync(png, path.join(resources, 'icon.png'));
	console.log(`Wrote ${path.join(resources, 'icon.icns')} and icon.png`);
} finally {
	rmSync(work, { recursive: true, force: true });
}
