#!/usr/bin/env node

/**
 * Flags documentation diagrams that have fallen behind the code they describe.
 *
 * The diagrams in docs/ are written by hand, so nothing stops the code from changing underneath
 * them. Each diagram document declares the source files it was drawn from, together with a
 * fingerprint (a short hash) of each of those files at the time the diagram was last confirmed
 * accurate:
 *
 *   <!-- diagram-sources: db/schema.mts=1a2b3c4d5e6f -->
 *
 * This script recomputes those fingerprints. If one no longer matches, the source file changed
 * since the diagram was last reviewed, and this exits non-zero asking for a look.
 *
 * A mismatch does NOT mean the diagram is wrong — renaming a local variable in a source file
 * trips it just as surely as adding a table does. It means "someone edited this file; check
 * whether the picture still tells the truth." Once you've checked:
 *
 *   npm run check:diagrams -- --update
 *
 * rewrites the fingerprints to the current files. Update the diagram first if it needs it — this
 * command only re-stamps, it can't draw.
 *
 * To cover a new diagram, add a `diagram-sources` comment to its document; this script finds them
 * on its own. To watch an additional file, add it to that document's comment with any placeholder
 * fingerprint and run the update command.
 *
 * This is deliberately a plain script rather than a tool-specific command, so it works the same
 * whether it's run by a person, CI, or any AI coding agent (Claude Code, Codex, or otherwise).
 *
 * Usage:
 *   node scripts/check-diagrams.js
 *   npm run check:diagrams
 *   npm run check:diagrams -- --update
 */

import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));
const docsDirectory = join(repositoryRoot, 'docs');
const stampPattern = /<!-- diagram-sources:(.*?)-->/s;
const FINGERPRINT_LENGTH = 12;

function fingerprint(absolutePath) {
	const contents = readFileSync(absolutePath, 'utf8');

	return createHash('sha256').update(contents).digest('hex').slice(0, FINGERPRINT_LENGTH);
}

function markdownFiles(directory) {
	const files = [];

	for (const entry of readdirSync(directory, { withFileTypes: true })) {
		const path = join(directory, entry.name);

		if (entry.isDirectory()) {
			files.push(...markdownFiles(path));
		} else if (entry.name.endsWith('.md')) {
			files.push(path);
		}
	}

	return files.sort((a, b) => a.localeCompare(b));
}

function parseStamp(contents) {
	const match = contents.match(stampPattern);

	if (!match) {
		return null;
	}
	const entries = match[1]
		.split(',')
		.map((entry) => entry.trim())
		.filter(Boolean)
		.map((entry) => {
			const [path, recorded = ''] = entry.split('=');

			return { path: path.trim(), recorded: recorded.trim() };
		});

	return { comment: match[0], entries };
}

function checkDocument(documentPath) {
	const contents = readFileSync(documentPath, 'utf8');
	const stamp = parseStamp(contents);

	if (!stamp) {
		return null;
	}
	const sources = stamp.entries.map((entry) => {
		const absolutePath = join(repositoryRoot, entry.path);

		if (!existsSync(absolutePath)) {
			return { ...entry, current: null, state: 'missing' };
		}
		const current = fingerprint(absolutePath);

		return { ...entry, current, state: current === entry.recorded ? 'current' : 'changed' };
	});

	return {
		label: relative(repositoryRoot, documentPath),
		documentPath,
		contents,
		comment: stamp.comment,
		sources,
	};
}

function stampComment(sources) {
	const entries = sources.map((source) => `${source.path}=${source.current ?? source.recorded}`);

	return `<!-- diagram-sources: ${entries.join(', ')} -->`;
}

function printReport(document) {
	const stale = document.sources.filter((source) => source.state !== 'current');

	if (stale.length === 0) {
		console.log(`${document.label}: up to date with ${document.sources.length} source file(s).`);

		return;
	}

	console.log(`${document.label}: ${stale.length} source file(s) changed since last reviewed:`);

	for (const source of stale) {
		console.log(
			source.state === 'missing'
				? `    ${source.path} (listed source no longer exists)`
				: `    ${source.path} (recorded ${source.recorded}, now ${source.current})`,
		);
	}
}

function main() {
	const shouldUpdate = process.argv.includes('--update');
	const documents = markdownFiles(docsDirectory)
		.map(checkDocument)
		.filter((document) => document !== null);

	if (documents.length === 0) {
		console.log('No documents in docs/ declare a diagram-sources comment.');
		process.exit(1);
	}

	const missing = documents.flatMap((document) =>
		document.sources
			.filter((source) => source.state === 'missing')
			.map((source) => ({ document: document.label, path: source.path })),
	);

	if (shouldUpdate) {
		if (missing.length > 0) {
			for (const entry of missing) {
				console.log(`${entry.document}: cannot stamp ${entry.path} — the file does not exist.`);
			}
			console.log(
				'\nRemove or correct the paths above, then run the update again. Nothing was changed.',
			);
			process.exit(1);
		}
		let updated = 0;

		for (const document of documents) {
			const comment = stampComment(document.sources);

			if (comment === document.comment) {
				continue;
			}
			writeFileSync(document.documentPath, document.contents.replace(document.comment, comment));
			console.log(`${document.label}: fingerprints updated.`);
			updated += 1;
		}
		console.log(
			updated === 0
				? '\nEvery diagram was already stamped with the current source files.'
				: `\n${updated} document(s) re-stamped. Commit them alongside the code change that ` +
						'made them stale.',
		);

		return;
	}

	for (const document of documents) {
		printReport(document);
	}

	const staleDocuments = documents.filter((document) =>
		document.sources.some((source) => source.state !== 'current'),
	);

	if (staleDocuments.length > 0) {
		console.log(
			`\n${staleDocuments.length} document(s) flagged above. Open each one, compare its diagram ` +
				'against the changed source file, and fix the diagram if it is now wrong. Then run ' +
				'`npm run check:diagrams -- --update` to record that it was reviewed.',
		);
		process.exit(1);
	}

	console.log('\nEvery diagram is up to date with the source files it documents.');
}

main();
