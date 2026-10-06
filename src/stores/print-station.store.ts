import { runInAction } from 'mobx';

import { NameTag } from '../models/name-tag.ts';
import { makeReactive } from '../services/make-reactive.ts';
import type { NameTagPrintJob } from '../services/print-jobs.ts';
import type { PrintStationApi } from '../services/print-station-api.ts';
import type { StationFailure } from '../services/station-request.ts';

export type PrintStationStoreOptions = {
	api: Pick<PrintStationApi, 'printJobs' | 'complete'>;
	pollIntervalMs?: number;
	now?: () => number;
};

/** A tag the station printed, for the "printed recently" list. */
export type PrintedTag = { job: NameTagPrintJob; printedAt: number };

const defaultPollIntervalMs = 2_000;
const recentLimit = 10;

/**
 * The `/printing-station` page's state: the tags waiting to print here, the one printing now, and
 * what it printed recently.
 *
 * It polls on a plain interval rather than `PageVisibilityPoller`, which pauses whenever the page is
 * hidden: the station shares a desktop with the room display, and stopping because a full-screen
 * window covered it would stop the printing too. Screen-lifetime, like `KioskStore`.
 */
export class PrintStationStore {
	private _waiting: NameTagPrintJob[] = [];
	private _recent: PrintedTag[] = [];
	private _failure: StationFailure | null = null;
	private _checkedAt: number | null = null;
	/**
	 * Tags already printed here whose removal from the server has not gone through yet. They stay
	 * off the waiting list when the server hands them back, and their removal is retried.
	 */
	private readonly printedIds = new Set<string>();
	private readonly api: PrintStationStoreOptions['api'];
	private readonly pollIntervalMs: number;
	private readonly now: () => number;
	private timer: ReturnType<typeof setInterval> | null = null;
	private request: Promise<void> | null = null;

	constructor(options: PrintStationStoreOptions) {
		this.api = options.api;
		this.pollIntervalMs = options.pollIntervalMs ?? defaultPollIntervalMs;
		this.now = options.now ?? (() => Date.now());

		makeReactive(this, {
			printedIds: false,
			api: false,
			pollIntervalMs: false,
			now: false,
			timer: false,
			request: false,
		});
	}

	/** The tag to print now, or null when nothing is waiting. */
	get current(): NameTagPrintJob | null {
		return this._waiting[0] ?? null;
	}

	/** The label for the tag printing now. The job carries only the initial, which is all it shows. */
	get currentTag(): NameTag | null {
		const job = this.current;

		return job
			? new NameTag({
					firstName: job.firstName,
					lastName: job.lastInitial,
					queuePosition: job.queuePosition,
					locale: job.locale,
				})
			: null;
	}

	get waitingCount(): number {
		return this._waiting.length;
	}

	/** Newest first. */
	get recent(): readonly PrintedTag[] {
		return this._recent;
	}

	get failure(): StationFailure | null {
		return this._failure;
	}

	/** When the station last reached the server, or null before it ever has. */
	get checkedAt(): number | null {
		return this._checkedAt;
	}

	get isLoading(): boolean {
		return this._checkedAt === null && this._failure === null;
	}

	start(): void {
		void this.poll();
		this.timer ??= setInterval(() => void this.poll(), this.pollIntervalMs);
	}

	/** Collects waiting tags once. A collection already in flight is shared rather than doubled. */
	poll(): Promise<void> {
		this.request ??= this.collect().finally(() => (this.request = null));

		return this.request;
	}

	/**
	 * Records that `job` printed: it leaves the waiting list for the recent one at once, and is
	 * removed from the server — retried on later polls if that fails, so it is never printed twice
	 * by this station.
	 */
	async printed(job: NameTagPrintJob): Promise<void> {
		this.printedIds.add(job.id);
		this._waiting = this._waiting.filter(({ id }) => id !== job.id);
		this._recent = [{ job, printedAt: this.now() }, ...this._recent].slice(0, recentLimit);

		await this.remove(job.id);
	}

	private async remove(id: string): Promise<void> {
		if (await this.api.complete(id)) {
			this.printedIds.delete(id);
		}
	}

	private async collect(): Promise<void> {
		const result = await this.api.printJobs();

		runInAction(() => {
			if (!result.ok) {
				this._failure = result.failure;

				return;
			}

			this._failure = null;
			this._checkedAt = this.now();

			const known = new Set(this._waiting.map(({ id }) => id));
			const fresh = result.jobs.filter(({ id }) => !known.has(id) && !this.printedIds.has(id));

			this._waiting = [...this._waiting, ...fresh];
		});

		if (result.ok) {
			await Promise.all([...this.printedIds].map((id) => this.remove(id)));
		}
	}

	[Symbol.dispose](): void {
		if (this.timer !== null) {
			clearInterval(this.timer);
			this.timer = null;
		}
	}
}
