import type { DemoRoster } from '../services/demo-preview';
import { makeReactive } from '../services/make-reactive';

const rosterKey = 'bay-compassion.demo-roster';

/** Owns the credentials issued by this tab's most recent demo load. */
export class DemoStore {
	private roster: DemoRoster | null = null;
	private displayedEventId: string | null = null;
	openError = false;
	constructor(private readonly storage: Storage = window.sessionStorage) {
		try {
			const saved = JSON.parse(storage.getItem(rosterKey) ?? 'null') as
				| (DemoRoster & { displayedEventId?: string | null })
				| null;

			if (saved && typeof saved.marketEventId === 'string' && Array.isArray(saved.guests)) {
				this.roster = saved;
				this.displayedEventId =
					saved.displayedEventId === undefined ? saved.marketEventId : saved.displayedEventId;
			}
		} catch {
			/* A damaged saved roster can be replaced by loading a scenario. */
		}

		return makeReactive(this, { storage: false });
	}
	save(roster: DemoRoster, displayedEventId: string | null = roster.marketEventId): void {
		this.roster = roster;
		this.displayedEventId = displayedEventId;
		this.openError = false;
		this.storage.setItem(rosterKey, JSON.stringify({ ...roster, displayedEventId }));
	}
	forSession(marketEventId: string | null): DemoRoster | null {
		return this.displayedEventId === marketEventId ? this.roster : null;
	}
	recordOpenResult(opened: boolean): void {
		this.openError = !opened;
	}
}
