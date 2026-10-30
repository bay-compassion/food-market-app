/**
 * Restores `Dirent.path`, which Node 24 removed in favor of `parentPath`, for `pnpm start`.
 *
 * Netlify's Async Workloads extension finds workloads by listing `netlify/functions` and keeping
 * only the entries whose `path` is set. On Node 24 that drops every file, so `netlify dev` never
 * injects the event router and every `AsyncWorkloadsClient#send()` gets a 404. Loaded through
 * `NODE_OPTIONS` so it reaches the build-plugin process too. Delete this once the extension reads
 * `parentPath`.
 */

const { Dirent } = require('node:fs');

if (!('path' in Dirent.prototype)) {
	Object.defineProperty(Dirent.prototype, 'path', {
		configurable: true,
		get() {
			return this.parentPath;
		},
	});
}
