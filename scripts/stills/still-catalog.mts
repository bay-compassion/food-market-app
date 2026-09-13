import type { StorybookStory } from './storybook-index.mjs';

/**
 * How much screen a still is given before it is photographed.
 *
 * `minHeight` is a floor, not a crop: a screen-sized frame always shows a whole phone even when the
 * content is shorter, while a component frame shrink-wraps so a button does not print as a stamp in
 * the middle of an empty page. Content taller or wider than the frame grows it, up to the maxima —
 * beyond those a still stops being something you can read on paper, so it is cut off and said so.
 */
export type StillFrame = {
	width: number;
	minHeight: number;
	maxWidth: number;
	maxHeight: number;
};

export const stillFrames = {
	/** A phone, matching the viewport `scripts/capture-twilio-opt-in.mts` shoots the real app at. */
	phone: { width: 390, minHeight: 844, maxWidth: 1600, maxHeight: 2_532 },
	/** The admin dashboard is a desk surface; a worker runs the market from a laptop. */
	desktop: { width: 1280, minHeight: 860, maxWidth: 2400, maxHeight: 2_600 },
	/** One control on its own, at the width it gets on a phone. */
	component: { width: 390, minHeight: 0, maxWidth: 1600, maxHeight: 1_600 },
	/** One piece of the dashboard — a queue row, a banner — at the width it gets there. */
	panel: { width: 1280, minHeight: 0, maxWidth: 2400, maxHeight: 1_600 },
} as const satisfies Record<string, StillFrame>;

export type FrameName = keyof typeof stillFrames;

/**
 * A Storybook title, or title prefix, belonging to a group — with its own frame when the group's
 * does not suit it. A strip of queue-position pips does not want a whole empty phone around it just
 * because the screens beside it do.
 */
export type GroupTitle = string | { prefix: string; frame: FrameName };

export type StillGroup = {
	id: string;
	title: string;
	summary: string;
	/** The frame every title in the group is shot at unless it names its own. */
	frame: FrameName;
	titles: GroupTitle[];
};

/**
 * The sheets, in the order they should come off the printer: a guest's path through a market day
 * first, then the worker's, then the pieces both are built from. Anything not named here is left
 * out of the sheets and reported, so a story added later is noticed rather than silently dropped.
 */
export const stillGroups: StillGroup[] = [
	{
		id: 'before-registration',
		title: 'Guest · before registration opens',
		summary: 'What a guest sees between markets, and as the registration window approaches.',
		frame: 'phone',
		titles: [
			'Guest/Session States/Inactive',
			'Guest/Market Status/Countdown',
			'Guest/ScheduleInformation',
		],
	},
	{
		id: 'identity',
		title: 'Guest · being recognized',
		summary: 'The saved identity card, notification consent, and claiming a worker-made record.',
		frame: 'phone',
		titles: ['Guest/Identity', 'Guest/GuestClaimCard'],
	},
	{
		id: 'registering',
		title: 'Guest · registering',
		summary: 'The forms a guest fills in, with their busy, failed, and right-to-left states.',
		frame: 'phone',
		titles: ['Guest/Forms'],
	},
	{
		id: 'visit',
		title: 'Guest · waiting and being called',
		summary: 'Every visit status once a guest is registered, and the queue position display.',
		frame: 'phone',
		titles: [
			'Guest/Session States/GuestVisitStatus',
			{ prefix: 'Guest/Session States/QueuePositionDots', frame: 'component' },
			{ prefix: 'Guest/Session States/VisitRefreshNotice', frame: 'component' },
			'Guest/Session States/All',
		],
	},
	{
		id: 'closed',
		title: 'Guest · missed the window, or service underway',
		summary: 'The cards shown to a guest with no visit once registration has closed.',
		frame: 'phone',
		titles: ['Guest/Session States/Registration Closed', 'Guest/GuestServiceState'],
	},
	{
		id: 'legal',
		title: 'Guest · legal documents',
		summary: 'The privacy policy and terms a guest reaches from the consent copy.',
		frame: 'phone',
		titles: ['Guest/LegalDocumentView'],
	},
	{
		id: 'admin-session',
		title: 'Worker · running the session',
		summary: 'The dashboard through a session lifecycle, from setup to service.',
		frame: 'desktop',
		titles: [
			'Admin/SessionView',
			'Admin/AdminDashboardLayout',
			'Admin/AdminDashboardTabs',
			'Admin/SessionBroadcastForm',
			{ prefix: 'Admin/AdminFeedbackBanner', frame: 'panel' },
		],
	},
	{
		id: 'admin-queue',
		title: 'Worker · the queue',
		summary: 'Calling, serving, and adding guests while service is running.',
		frame: 'desktop',
		titles: [
			'Admin/QueueView',
			{ prefix: 'Admin/QueueGuestRow', frame: 'panel' },
			'Admin/ManualGuestDialog',
		],
	},
	{
		id: 'admin-guests',
		title: 'Worker · guest database and demo preview',
		summary: 'Looking guests up between markets, and previewing the guest app from the dashboard.',
		frame: 'desktop',
		titles: [
			'Admin/GuestDatabaseGrid',
			'Admin/GuestDatabaseView',
			'Admin/Demo guest picker',
			{ prefix: 'Admin/Demo preview banner', frame: 'panel' },
		],
	},
	{
		id: 'design-system',
		title: 'Design system',
		summary: 'Tokens and the shared controls every screen above is assembled from.',
		frame: 'component',
		titles: ['Design System', 'Primitives', 'Components'],
	},
];

export type StillSection = {
	group: StillGroup;
	stories: StorybookStory[];
};

function prefixOf(title: GroupTitle): string {
	return typeof title === 'string' ? title : title.prefix;
}

type Match = { group: StillGroup; title: GroupTitle };

export class StillCatalog {
	constructor(private readonly groups: readonly StillGroup[] = stillGroups) {}

	get groupIds(): string[] {
		return this.groups.map((group) => group.id);
	}

	/** The most specific group claiming this story, so a subtree can be split off its parent. */
	groupFor(story: StorybookStory): StillGroup | undefined {
		return this.match(story)?.group;
	}

	/** The frame to shoot this story at: its title's own if it names one, otherwise its group's. */
	frameFor(story: StorybookStory): StillFrame {
		const matched = this.match(story);

		if (!matched) {
			return stillFrames.phone;
		}

		const { group, title } = matched;

		return stillFrames[typeof title === 'string' ? group.frame : title.frame];
	}

	/** Longest matching prefix wins, and a prefix only ever matches whole title segments. */
	private match(story: StorybookStory): Match | undefined {
		let best: Match | undefined;

		for (const group of this.groups) {
			for (const title of group.titles) {
				const prefix = prefixOf(title);

				if (story.title !== prefix && !story.title.startsWith(`${prefix}/`)) {
					continue;
				}

				if (!best || prefix.length > prefixOf(best.title).length) {
					best = { group, title };
				}
			}
		}

		return best;
	}

	/** Groups in catalog order, each holding its stories in the story index's order. */
	sections(stories: readonly StorybookStory[], onlyGroupIds?: readonly string[]): StillSection[] {
		const wanted = onlyGroupIds && onlyGroupIds.length > 0 ? new Set(onlyGroupIds) : undefined;
		const byGroup = new Map<string, StorybookStory[]>();

		for (const story of stories) {
			const group = this.groupFor(story);

			if (group && (!wanted || wanted.has(group.id))) {
				byGroup.set(group.id, [...(byGroup.get(group.id) ?? []), story]);
			}
		}

		return this.groups
			.filter((group) => byGroup.has(group.id))
			.map((group) => ({ group, stories: byGroup.get(group.id) ?? [] }));
	}

	/** Stories no group claims — a new area, or a title the catalog has fallen behind. */
	unmatched(stories: readonly StorybookStory[]): StorybookStory[] {
		return stories.filter((story) => !this.groupFor(story));
	}
}
