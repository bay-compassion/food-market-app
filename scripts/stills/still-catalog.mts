import type { StorybookStory } from './storybook-index.mjs';

/**
 * How much screen a still is given before it is photographed.
 *
 * `minHeight` is a floor, not a crop: a screen-sized frame always shows a whole phone even when the
 * content is shorter, while a component frame shrink-wraps so a card does not print as a stamp in
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
	/** One card on its own, at the width it gets on a phone. */
	component: { width: 390, minHeight: 0, maxWidth: 1600, maxHeight: 1_600 },
	/** One piece of the dashboard — a queue row, a banner — at the width it gets there. */
	panel: { width: 1280, minHeight: 0, maxWidth: 2400, maxHeight: 1_600 },
} as const satisfies Record<string, StillFrame>;

export type FrameName = keyof typeof stillFrames;

/** One beat of an arc: a story, and what that story is doing here. */
export type StillStep = {
	/** The Storybook story id — the `id` in a story's URL, or a key in Storybook's `index.json`. */
	id: string;
	/** The beat, in the arc's words rather than the story's. Printed under the still. */
	caption: string;
	/** Overrides the arc's frame when this one beat calls for a different amount of screen. */
	frame?: FrameName;
};

export type StillArc = {
	id: string;
	title: string;
	summary: string;
	/** The frame every step is shot at unless it names its own. */
	frame: FrameName;
	steps: StillStep[];
};

/**
 * The arcs, in the order they should come off the printer.
 *
 * These are deliberately a small, hand-picked set — the large movements of a market day, not a
 * catalog of every state a component can hold. Storybook is the inventory; this is the edit. A step
 * earns its place by being a different moment in the day, so two stories that differ only in a
 * detail contribute one still between them, and a story left out is left out on purpose.
 */
export const stillArcs: StillArc[] = [
	{
		id: 'guest-day',
		title: 'A guest’s day',
		summary: 'The path from finding the market closed to being served, and back again next week.',
		frame: 'phone',
		steps: [
			{
				id: 'guest-session-states-inactive--not-open',
				caption: 'Between markets — when the next window opens',
			},
			{
				id: 'guest-forms-combined-form--registration-form',
				caption: 'Registration is open — name, phone, household',
			},
			{
				id: 'guest-session-states-guestvisitstatus--registered',
				caption: 'Registered, waiting on the draw',
			},
			{
				id: 'guest-session-states-guestvisitstatus--waiting',
				caption: 'Drawn — a place in the queue',
			},
			{
				id: 'guest-session-states-guestvisitstatus--called',
				caption: 'Called to the cart',
			},
			{
				id: 'guest-session-states-guestvisitstatus--served',
				caption: 'Served — the day is done',
			},
			{
				id: 'guest-identity-identity-card--identified',
				caption: 'Next week: recognized on this device',
				frame: 'component',
			},
		],
	},
	{
		id: 'guest-otherwise',
		title: 'Where a guest’s day goes otherwise',
		summary: 'The endings that are not being served, and the two ways of arriving too late.',
		frame: 'phone',
		steps: [
			{
				id: 'guest-session-states-guestvisitstatus--not-placed',
				caption: 'Registered, but not drawn',
			},
			{
				id: 'guest-session-states-registration-closed--registration-closed',
				caption: 'Arrived after registration closed',
			},
			{
				id: 'guest-guestservicestate--in-progress',
				caption: 'Arrived while service is already running',
			},
			{
				id: 'guest-session-states-guestvisitstatus--cancelled',
				caption: 'Gave up their place',
			},
			{
				id: 'guest-session-states-guestvisitstatus--no-show',
				caption: 'Called, but not there',
			},
			{
				id: 'guest-forms-combined-form--submission-failed',
				caption: 'Registration did not go through',
			},
		],
	},
	{
		id: 'market-day',
		title: 'The market’s state through the day',
		summary:
			'The session lifecycle a worker drives, and the queue it produces. ' +
			'Companion to docs/session-lifecycle.md.',
		frame: 'desktop',
		steps: [
			{ id: 'admin-sessionview--setup', caption: 'Draft — nothing scheduled yet' },
			{ id: 'admin-sessionview--scheduled', caption: 'Scheduled — a window is set' },
			{
				id: 'admin-sessionview--registration-open',
				caption: 'Registration open — guests arriving',
			},
			{ id: 'admin-sessionview--registration-closed', caption: 'Registration closed' },
			{ id: 'admin-sessionview--lottery-pending', caption: 'Lottery pending — ready to draw' },
			{ id: 'admin-sessionview--service-started', caption: 'Service started' },
			{
				id: 'admin-queueview--before-service-starts',
				caption: 'The queue, before anyone is called',
			},
			{ id: 'admin-queueview--during-service', caption: 'The queue, mid-service' },
			{
				id: 'admin-queueview--everyone-finished',
				caption: 'Everyone finished — the session can close',
			},
		],
	},
];

export type StillSection = {
	arc: StillArc;
	steps: StillStep[];
};

export class StillCatalog {
	constructor(private readonly allArcs: readonly StillArc[] = stillArcs) {}

	get arcIds(): string[] {
		return this.allArcs.map((arc) => arc.id);
	}

	/** The requested arcs in catalog order, or all of them when none are named. */
	sections(onlyArcIds?: readonly string[]): StillSection[] {
		const wanted = onlyArcIds && onlyArcIds.length > 0 ? new Set(onlyArcIds) : undefined;

		return this.allArcs
			.filter((arc) => !wanted || wanted.has(arc.id))
			.map((arc) => ({ arc, steps: arc.steps }));
	}

	frameFor(arc: StillArc, step: StillStep): StillFrame {
		return stillFrames[step.frame ?? arc.frame];
	}

	/**
	 * Step ids Storybook does not have. The arcs name their stories outright, so a renamed or
	 * deleted story silently drops a beat out of the middle of a printed arc unless this is checked.
	 * The reverse — a story no arc names — is not a problem: leaving stories out is the point.
	 */
	missing(stories: readonly StorybookStory[]): string[] {
		const available = new Set(stories.map((story) => story.id));

		return this.allArcs
			.flatMap((arc) => arc.steps.map((step) => step.id))
			.filter((id) => !available.has(id));
	}
}
