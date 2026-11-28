import { makeAutoObservable, runInAction } from 'mobx';

/** Where the poster stands: reading the code, ready to print, no session to print one for, or failed. */
export type StandbyPosterState = 'loading' | 'ready' | 'no_session' | 'failed';

/**
 * The standby poster's code: the current session's, read once when the poster opens. A session has
 * one code for its whole run, so there is nothing to poll. Built by the lazily loaded poster route.
 */
export class StandbyPosterStore {
	state: StandbyPosterState = 'loading';
	code: string | null = null;

	constructor(private readonly fetchCode: () => Promise<string | null>) {
		makeAutoObservable<this, 'fetchCode'>(this, { fetchCode: false }, { autoBind: true });
	}

	async load(): Promise<void> {
		this.state = 'loading';

		try {
			const code = await this.fetchCode();

			runInAction(() => {
				this.code = code;
				this.state = code ? 'ready' : 'no_session';
			});
		} catch {
			runInAction(() => {
				this.state = 'failed';
			});
		}
	}
}
