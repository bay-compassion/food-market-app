import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadEnvFile } from 'node:process';

import { deploy, dump } from 'auth0-deploy-cli';
import type { Config } from 'auth0-deploy-cli/lib/types';
import { Command } from 'commander';

const auth0Directory = import.meta.dirname;

function loadConfig(): Partial<Config> {
	const config: unknown = JSON.parse(readFileSync(resolve(auth0Directory, 'config.json'), 'utf8'));

	if (!config || typeof config !== 'object' || Array.isArray(config)) {
		throw new Error('infrastructure/auth0/config.json must contain an object.');
	}

	return config as Partial<Config>;
}

async function run(command: 'export' | 'plan' | 'import') {
	loadEnvFile(resolve(auth0Directory, command === 'export' ? '.env.source' : '.env.target'));

	const options = {
		// Programmatic config outranks the environment, preserving the safety guards.
		config: loadConfig(),
		env: true,
	};

	if (command === 'export') {
		await dump({
			...options,
			format: 'yaml',
			output_folder: resolve(auth0Directory, 'export'),
		});

		return;
	}

	if (command === 'plan') {
		// A preview must stay read-only even if the environment enables applying a dry run.
		process.env.AUTH0_DRY_RUN_APPLY = 'false';
		process.env.AUTH0_DRY_RUN_INTERACTIVE = 'false';
	}

	await deploy({
		...options,
		input_file: resolve(auth0Directory, 'tenant/tenant.yaml'),
		...(command === 'plan' ? { dry_run: 'preview' as const } : {}),
	});
}

const program = new Command()
	.name('node infrastructure/auth0/auth0.mts')
	.description('Manage Auth0 tenant configuration using the Deploy CLI Node API.')
	.showHelpAfterError();

program
	.command('export')
	.description('Read the source Auth0 tenant into the infrastructure export staging directory.')
	.action(() => run('export'));

program
	.command('plan')
	.description('Preview the reviewed infrastructure configuration against the target Auth0 tenant.')
	.action(() => run('plan'));

program
	.command('import')
	.description('Apply the reviewed infrastructure configuration to the target Auth0 tenant.')
	.action(() => run('import'));

try {
	await program.parseAsync();
} catch (error) {
	console.error(error instanceof Error ? error.message : String(error));
	process.exitCode = 1;
}
