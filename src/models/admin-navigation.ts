import {
	adminViewGroup,
	adminViewGroups,
	type AdminView,
	type AdminViewGroup,
} from '../services/admin-views.ts';

/** One run of the navigation: a heading's screens, or the ungrouped tools that trail them. */
export type AdminNavigationSection = {
	group: AdminViewGroup | null;
	views: AdminView[];
};

/**
 * The admin navigation as one worker sees it: the screens their role opens, sorted under the
 * headings that say what each is for.
 *
 * Built from the permitted views rather than holding them, so the store can expose it as a
 * computed that is rebuilt whenever the worker's permissions resolve.
 */
export class AdminNavigation {
	/**
	 * Up to this many screens read at a glance without headings. A queue worker opens three, and
	 * "Today" over one of them and "Records" over the other two would only make the list longer.
	 */
	static readonly listedWithoutHeadings = 3;

	constructor(private readonly views: readonly AdminView[]) {}

	/** Whether the worker can open anything at all. */
	get isEmpty(): boolean {
		return this.views.length === 0;
	}

	/** Whether `view` is one of this worker's screens — and so whether it can be marked current. */
	includes(view: AdminView): boolean {
		return this.views.includes(view);
	}

	/** Whether the sections are long enough, and varied enough, to be worth heading. */
	get showsHeadings(): boolean {
		return (
			this.views.length > AdminNavigation.listedWithoutHeadings &&
			this.sections.filter((section) => section.group !== null).length > 1
		);
	}

	/** The worker's screens by heading, headings in order, the ungrouped tools last. Empty runs are left out. */
	get sections(): AdminNavigationSection[] {
		const grouped = adminViewGroups.map((group) => ({
			group,
			views: this.views.filter((view) => adminViewGroup[view] === group),
		}));
		const ungrouped = { group: null, views: this.views.filter((view) => !adminViewGroup[view]) };

		return [...grouped, ungrouped].filter((section) => section.views.length > 0);
	}
}
