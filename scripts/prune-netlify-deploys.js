#!/usr/bin/env node

/**
 * Deletes every Netlify deploy for this site except the one currently published to production.
 *
 * Usage:
 *   NETLIFY_AUTH_TOKEN=xxxx node scripts/prune-netlify-deploys.js          # dry run (default)
 *   NETLIFY_AUTH_TOKEN=xxxx node scripts/prune-netlify-deploys.js --yes    # actually delete
 *
 * Requires a Netlify personal access token with access to this site:
 * https://app.netlify.com/user/applications#personal-access-tokens
 */

const API_BASE = 'https://api.netlify.com/api/v1';

const siteId = process.env.NETLIFY_SITE_ID ?? '01c57bdf-8deb-40f8-8864-5ff4b470090b';
const token = process.env.NETLIFY_AUTH_TOKEN;
const confirmed = process.argv.includes('--yes') || process.argv.includes('-y');

if (!token) {
	console.error(
		'Set NETLIFY_AUTH_TOKEN to a Netlify personal access token before running this script.',
	);
	process.exit(1);
}

async function netlifyFetch(path, options = {}) {
	const response = await fetch(`${API_BASE}${path}`, {
		...options,
		headers: {
			Authorization: `Bearer ${token}`,
			...options.headers,
		},
	});

	if (!response.ok) {
		const body = await response.text();

		throw new Error(`${options.method ?? 'GET'} ${path} failed: ${response.status} ${body}`);
	}

	return response.status === 204 ? null : response.json();
}

async function fetchAllDeploys() {
	const perPage = 100;
	const deploys = [];

	for (let page = 1; ; page++) {
		const batch = await netlifyFetch(`/sites/${siteId}/deploys?page=${page}&per_page=${perPage}`);

		deploys.push(...batch);

		if (batch.length < perPage) {
			break;
		}
	}

	return deploys;
}

// Deploys in these states are still in progress; deleting them would break an active build.
const IN_PROGRESS_STATES = new Set(['building', 'enqueued', 'processing', 'uploading', 'uploaded']);

async function main() {
	const site = await netlifyFetch(`/sites/${siteId}`);
	const productionDeployId = site.published_deploy?.id;

	if (!productionDeployId) {
		console.error('Could not determine the current production deploy for this site.');
		process.exit(1);
	}

	const deploys = await fetchAllDeploys();

	const toDelete = deploys.filter(
		(deploy) => deploy.id !== productionDeployId && !IN_PROGRESS_STATES.has(deploy.state),
	);

	console.log(`Site: ${site.name} (${siteId})`);
	console.log(`Current production deploy: ${productionDeployId} (kept)`);
	console.log(`Total deploys: ${deploys.length}`);
	console.log(`Deploys to delete: ${toDelete.length}`);

	if (toDelete.length === 0) {
		console.log('Nothing to delete.');

		return;
	}

	for (const deploy of toDelete) {
		console.log(
			`  - ${deploy.id}  ${deploy.state.padEnd(10)}  ${deploy.created_at}  ${deploy.branch ?? ''}`,
		);
	}

	if (!confirmed) {
		console.log('\nDry run only. Re-run with --yes to actually delete the deploys listed above.');

		return;
	}

	console.log('\nDeleting...');
	let deleted = 0;

	for (const deploy of toDelete) {
		try {
			await netlifyFetch(`/deploys/${deploy.id}`, { method: 'DELETE' });
			deleted++;
			console.log(`  deleted ${deploy.id}`);
		} catch (error) {
			console.error(`  failed to delete ${deploy.id}: ${error.message}`);
		}
	}

	console.log(`\nDeleted ${deleted}/${toDelete.length} deploys.`);
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
