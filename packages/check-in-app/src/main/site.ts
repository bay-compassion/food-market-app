const productionOrigin = 'https://app.thebaycompassion.org';
const siteFlag = '--site=';

/**
 * The deploy the app opens: production unless told otherwise, by `--site=<origin>` on the command
 * line (`pnpm dev -- --site=…`, or after the packaged binary in Terminal) or by `CHECK_IN_SITE`.
 */
export class Site {
	readonly origin: string;

	constructor(address: string) {
		this.origin = new URL(address).origin;
	}

	static fromEnvironment(argv: readonly string[], env: NodeJS.ProcessEnv): Site {
		const flag = argv.find((argument) => argument.startsWith(siteFlag));

		return new Site(flag?.slice(siteFlag.length) ?? env.CHECK_IN_SITE ?? productionOrigin);
	}

	get queueDesk(): string {
		return new URL('/queue', this.origin).toString();
	}
}
