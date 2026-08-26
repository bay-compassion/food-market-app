#!/usr/bin/env node

/**
 * Runs the same checks required before opening a pull request (see README "Checks" and
 * docs/testing.md) and prints a clear pass/fail summary. Exits non-zero if any check failed.
 *
 * This is deliberately a plain script rather than a tool-specific command, so it works the same
 * whether it's run by a person, CI, or any AI coding agent (Claude Code, Codex, or otherwise).
 *
 * Usage:
 *   node scripts/checks.js
 *   npm run checks
 */

import { spawnSync } from 'node:child_process';

const checks = [
	{ label: 'lint', command: 'npm', args: ['run', 'lint'] },
	{ label: 'format:check', command: 'npm', args: ['run', 'format:check'] },
	{ label: 'check:diagrams', command: 'npm', args: ['run', 'check:diagrams'] },
	{ label: 'test:unit', command: 'npm', args: ['run', 'test:unit', '--', '--run'] },
	{ label: 'build', command: 'npm', args: ['run', 'build'] },
];

const results = [];

for (const check of checks) {
	console.log(`\n── ${check.label} ──`);
	const result = spawnSync(check.command, check.args, { stdio: 'inherit' });

	results.push({ ...check, passed: result.status === 0 });
}

console.log('\nSummary:');

for (const result of results) {
	console.log(`  ${result.passed ? 'PASS' : 'FAIL'}  ${result.label}`);
}

if (results.every((result) => result.passed)) {
	console.log('\nAll checks passed — this change is ready to open as a pull request.');
} else {
	console.log(
		'\nOne or more checks failed — see output above. Fix the underlying problem (or ask if the ' +
			"cause isn't clear). Don't delete a failing test, disable a lint rule, or loosen a check's " +
			'configuration just to force it green.',
	);
	process.exit(1);
}
