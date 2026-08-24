#!/usr/bin/env node

/**
 * Flags locale entries that are likely never-translated copies of the English text.
 *
 * TypeScript already guarantees every language in src/locales.ts and src/adminLocales.ts has
 * every key (both are declared `satisfies Record<Locale, Translation>`), so a *missing* key
 * can't ship silently — `npm run build` fails first. What this catches instead is a value that's
 * still character-for-character identical to English, a strong sign it was copied rather than
 * translated.
 *
 * A match isn't automatically wrong — proper names (like "The Bay Compassion", which AGENTS.md
 * says should not be translated) and very short values can legitimately be identical across
 * languages. Review each flagged entry before assuming it's a bug.
 *
 * This is deliberately a plain script rather than a tool-specific command, so it works the same
 * whether it's run by a person, CI, or any AI coding agent (Claude Code, Codex, or otherwise).
 *
 * Usage:
 *   node scripts/check-translations.js
 *   npm run check:translations
 */

const KNOWN_EXCEPTIONS = new Set(['The Bay Compassion']);
const MIN_FLAGGED_LENGTH = 3;

function flatten(value, prefix = '') {
	const result = {};
	for (const [key, entry] of Object.entries(value)) {
		const path = prefix ? `${prefix}.${key}` : key;
		if (typeof entry === 'string') {
			result[path] = entry;
		} else if (entry && typeof entry === 'object') {
			Object.assign(result, flatten(entry, path));
		}
	}

	return result;
}

async function checkDictionary(label, moduleUrl, exportName) {
	const module = await import(moduleUrl);
	const dictionary = module[exportName];
	const english = flatten(dictionary.en);
	const languages = Object.keys(dictionary).filter((code) => code !== 'en');
	const findings = [];

	for (const language of languages) {
		for (const [key, value] of Object.entries(flatten(dictionary[language]))) {
			if (
				value === english[key] &&
				value.trim().length >= MIN_FLAGGED_LENGTH &&
				!KNOWN_EXCEPTIONS.has(value)
			) {
				findings.push({ language, key, value });
			}
		}
	}

	return { label, findings };
}

function printReport({ label, findings }) {
	if (findings.length === 0) {
		console.log(`${label}: no likely-missed translations found.`);

		return;
	}

	console.log(`${label}: ${findings.length} value(s) identical to English:`);
	const byLanguage = new Map();
	for (const finding of findings) {
		if (!byLanguage.has(finding.language)) {
			byLanguage.set(finding.language, []);
		}
		byLanguage.get(finding.language).push(finding);
	}
	for (const [language, items] of byLanguage) {
		console.log(`  ${language}:`);
		for (const item of items) {
			console.log(`    ${item.key}: "${item.value}"`);
		}
	}
}

async function main() {
	const results = await Promise.all([
		checkDictionary(
			'src/locales.ts',
			new URL('../src/locales.ts', import.meta.url),
			'translations',
		),
		checkDictionary(
			'src/adminLocales.ts',
			new URL('../src/adminLocales.ts', import.meta.url),
			'adminTranslations',
		),
	]);

	for (const result of results) {
		printReport(result);
	}

	const total = results.reduce((sum, result) => sum + result.findings.length, 0);
	if (total > 0) {
		console.log(
			`\n${total} value(s) flagged for review above. A match isn't always wrong — proper names ` +
				'and very short values can legitimately repeat across languages — but check each one ' +
				'before assuming it is fine.',
		);
		process.exit(1);
	}

	console.log('\nNo likely-missed translations found.');
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
