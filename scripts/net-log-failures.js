#!/usr/bin/env node

/**
 * Prints every request that failed in a Chromium net-log, with its error code — temporary, for
 * diagnosing the storybook job's intermittent "Cannot connect to the iframe" failure, where the
 * browser's own network errors never reach the Vitest output.
 *
 *   node scripts/net-log-failures.js /tmp/chromium-net-log.json
 *
 * A browser that exits mid-write leaves the JSON unterminated, so a truncated log is closed off
 * and read as far as it goes.
 */
import { readFileSync } from 'node:fs';

const path = process.argv[2];

if (!path) {
	console.error('Usage: node scripts/net-log-failures.js <net-log.json>');
	process.exit(2);
}

const log = parseNetLog(readFileSync(path, 'utf8'));

function parseNetLog(raw) {
	try {
		return JSON.parse(raw);
	} catch {
		return JSON.parse(`${raw.trimEnd().replace(/,$/, '')}]}`);
	}
}

const errorNames = new Map(
	Object.entries(log.constants.netError).map(([name, code]) => [code, name]),
);
// Logged on healthy runs too: a cancelled request, a cache lookup, a WebSocket upgrade.
const routine = new Set(['ERR_ABORTED', 'ERR_CACHE_MISS', 'ERR_WS_UPGRADE']);
const urlRequest = log.constants.logSourceType.URL_REQUEST;
const urls = new Map();
const failures = new Map();

// Only URL requests: the socket and DNS jobs under them repeat the same failure without a URL.
for (const event of log.events) {
	if (event.source?.type !== urlRequest) {
		continue;
	}

	const id = event.source.id;
	const params = event.params ?? {};

	if (typeof params.url === 'string' && !urls.has(id)) {
		urls.set(id, params.url);
	}

	if (typeof params.net_error === 'number' && params.net_error < 0) {
		failures.set(id, { code: params.net_error, time: Number(event.time) });
	}
}

const rows = [...failures]
	.map(([id, { code, time }]) => ({ time, error: errorNames.get(code) ?? code, url: urls.get(id) }))
	// A story page's own load is kept even when aborted: that is the request the failure is about.
	.filter(({ error, url }) => !routine.has(error) || url?.includes('iframeId='))
	.sort((first, second) => first.time - second.time);

console.log(`${rows.length} failed requests (routine codes left out):`);

for (const { time, error, url } of rows) {
	console.log(`${time}\t${error}\t${url ?? '(no URL)'}`);
}
