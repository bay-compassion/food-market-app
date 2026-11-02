#!/usr/bin/env node
/**
 * Confirms the steward area stays in its own chunk.
 *
 * Draw odds and temperature are for named stewards, and a guest must never find them in their
 * download. `/steward` is lazily loaded so they aren't, but one stray import from a shared module
 * would pull them in with no error anywhere. So this reads the built chunks, after `pnpm run build`,
 * and fails if words only that area uses appear in any chunk but its own.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const assets = 'dist/assets';
const stewardOnly = ['Longest Shut Out', 'Temperature of This Pool', 'missedInARow'];
const chunks = readdirSync(assets).filter((name) => name.endsWith('.js'));
const stewardChunks = chunks.filter((name) => name.startsWith('StewardRoute-'));
const leaks = chunks
	.filter((name) => !name.startsWith('StewardRoute-'))
	.flatMap((name) => {
		const source = readFileSync(join(assets, name), 'utf8');

		return stewardOnly.filter((word) => source.includes(word)).map((word) => `${name}: ${word}`);
	});

if (stewardChunks.length === 0) {
	console.error('No StewardRoute chunk found. Run `pnpm run build` first.');
	process.exit(1);
}

if (leaks.length > 0) {
	console.error(`Steward code reached a shared chunk:\n${leaks.join('\n')}`);
	process.exit(1);
}

console.log('The steward area is only in its own chunk.');
