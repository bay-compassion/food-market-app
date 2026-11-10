import './config-environment.ts';
import config from 'config';

export type UpdateSettings = { enabled: boolean; owner: string; repo: string; url?: string };

/**
 * Where the app points and what it calls itself, from `config/` (see the README). `default.json` is
 * production; `development.json`, what `pnpm dev` uses, is a local `pnpm start` and the Auth0
 * tenant it signs in through.
 */
export class Settings {
	/** The deployed app's origin. */
	readonly site: string;
	/** The origin of the Auth0 sign-in page: the only page a saved password is filled in on. */
	readonly signIn: string;
	/**
	 * The app's name. It also names its data folder, so a development copy keeps its own session,
	 * saved password and one-copy lock, apart from the real app on the same Mac.
	 */
	readonly name: string;
	/** The printer tags go to, by its macOS queue name; null for the Mac's default printer. */
	readonly printer: string | null;
	/**
	 * Where releases come from: the repository's GitHub Releases, or, when `url` is set, a plain web
	 * folder holding a release's `latest-mac.yml` and zip, for testing an update locally.
	 */
	readonly updates: UpdateSettings;
	readonly environment: string;

	constructor(values: {
		site: string;
		signIn: string;
		name: string;
		printer: string | null;
		updates: UpdateSettings;
		environment: string;
	}) {
		this.site = new URL(values.site).origin;
		this.signIn = new URL(values.signIn).origin;
		this.name = values.name;
		this.printer = values.printer || null;
		this.updates = { ...values.updates, url: values.updates.url || undefined };
		this.environment = values.environment;
	}

	static load(): Settings {
		return new Settings({
			site: config.get<string>('site'),
			signIn: config.get<string>('signIn'),
			name: config.get<string>('name'),
			printer: config.get<string | null>('printer'),
			updates: config.get<UpdateSettings>('updates'),
			environment: config.util.getEnv('NODE_CONFIG_ENV'),
		});
	}

	get queueDesk(): string {
		return new URL('/queue', this.site).toString();
	}

	get printStation(): string {
		return new URL('/printing-station', this.site).toString();
	}
}
