/**
 * The things on the guest phone a guide's narration points at and taps, by name, and the layer
 * that draws the pointing. A mark names something the guest sees rather than a node in the app's
 * markup, so this is the one place that knows where each one is: the app's own guided-tour anchors
 * (`data-tour`) where it has them, and otherwise the component's class or its accessible name.
 */
import { languages, type Translation } from '../../../src/locales.ts';

/** A fieldset in the registration form, by its legend. */
function fieldset(doc: Document, legend: string): HTMLElement | null {
	for (const element of doc.querySelectorAll<HTMLElement>(
		'[data-tour="registration-form"] fieldset',
	)) {
		if (element.querySelector('legend')?.textContent === legend) {
			return element;
		}
	}

	return null;
}

/** A button inside `root`, by its label. */
function button(root: ParentNode | null, label: string): HTMLElement | null {
	for (const element of root?.querySelectorAll<HTMLElement>('button') ?? []) {
		if (element.textContent?.trim() === label) {
			return element;
		}
	}

	return null;
}

/** The smallest element holding both the guest's number and the now-calling row, or the number. */
function standing(doc: Document): HTMLElement | null {
	const board = doc.querySelector<HTMLElement>('.queue-number-board');
	const calling = doc.querySelector('.now-calling');
	let element = board;

	while (element && calling && !element.contains(calling)) {
		element = element.parentElement;
	}

	return element ?? board;
}

/** The element a mark names on the screen as it is now, or `null` when it isn't showing. */
export function markTarget(mark: string, doc: Document, t: Translation): HTMLElement | null {
	if (mark.startsWith('language-')) {
		const index = languages.findIndex(({ code }) => `language-${code}` === mark);

		return doc.querySelectorAll<HTMLElement>('.language-list button')[index] ?? null;
	}

	switch (mark) {
		case 'languages':
			return doc.querySelector('.language-list');
		case 'timer':
			return doc.querySelector('[data-tour="registration-countdown"]');
		case 'identity':
			return fieldset(doc, t.guestView.forms.informationLegend);
		case 'household':
			return fieldset(doc, t.guestView.forms.lotteryLegend);
		case 'join':
			return doc.querySelector('[data-tour="registration-form"] button[type="submit"]');
		case 'identity-card':
			return doc.querySelector('.guest-identity');
		case 'texts':
			return doc.querySelector('[data-tour="text-updates"]');
		case 'enable':
			return button(
				doc.querySelector('[role="dialog"] .notification-consent'),
				t.guestView.notificationOptIn.enable,
			);
		case 'number':
			return doc.querySelector('.queue-number-board');
		case 'nowcalling':
			return doc.querySelector('.now-calling');
		// The guest's number and the numbers being called, which a visit keeps in view together.
		case 'standing':
			return standing(doc);
		// The help page itself, or the way to it from the home screen.
		case 'help':
			return (
				doc.querySelector('[aria-labelledby="help-heading"]') ??
				doc.querySelector<HTMLElement>('.guest-content a[href="/help"]')?.parentElement ??
				null
			);
		default:
			return null;
	}
}

/**
 * Draws a ring around what the narration points at, and a ripple where a finger lands. Each draws
 * in the layer that moves with its target: the page's scrolling content, or — for a sheet that sits
 * above it — the screen itself.
 */
export class MarkLayer {
	private lastTap: string | null = null;

	constructor(
		/** The page's scrolling content, once it has drawn. */
		private readonly content: () => HTMLElement | null,
		/** A layer over the whole screen, above any sheet. */
		private readonly screen: HTMLElement,
	) {}

	draw(focus: HTMLElement | null, tap: HTMLElement | null, tapKey: string | null): void {
		this.clear('.phone-spot');
		this.place(focus, 'phone-spot');

		// A ripple runs once per tap; redrawing the same tap leaves it running.
		if (tapKey !== this.lastTap) {
			this.clear('.phone-tap');
			this.place(tap, 'phone-tap');
			this.lastTap = tapKey;
		}
	}

	private clear(selector: string): void {
		for (const element of [
			...(this.content()?.querySelectorAll(selector) ?? []),
			...this.screen.querySelectorAll(`:scope > ${selector}`),
		]) {
			element.remove();
		}
	}

	private place(target: HTMLElement | null, className: string): void {
		if (!target) {
			return;
		}

		const content = this.content();
		const layer = content?.contains(target) ? content : this.screen;
		const origin = layer.getBoundingClientRect();
		const rect = target.getBoundingClientRect();
		const mark = target.ownerDocument.createElement('div');

		mark.className = className;
		mark.setAttribute('aria-hidden', 'true');
		Object.assign(mark.style, {
			left: `${rect.left - origin.left}px`,
			top: `${rect.top - origin.top}px`,
			width: `${rect.width}px`,
			height: `${rect.height}px`,
			borderRadius: getComputedStyle(target).borderRadius,
		});
		layer.appendChild(mark);
	}
}

/**
 * Scrolls the frame's page under its bar (the `.phone-scroll` inside `container`) so `target` shows
 * whole — its top, when it is taller than the screen — or back to the top. The page moves by a
 * transform, which the stylesheet eases.
 */
export function scrollUnderBar(container: HTMLElement, target: HTMLElement | null): void {
	const scroller = container.querySelector<HTMLElement>('.phone-scroll');

	if (!scroller) {
		return;
	}

	const bar = container.querySelector('header')?.getBoundingClientRect().bottom ?? 0;
	const view = window.innerHeight - bar;
	let offset = 0;

	if (target && scroller.contains(target)) {
		const top = target.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
		const bottom = top + target.offsetHeight;
		const most = Math.max(0, scroller.offsetHeight - view);

		offset = Math.min(Math.max(0, bottom + 16 - view), Math.max(0, top - 16), most);
	}

	scroller.style.transform = `translateY(${-offset}px)`;
}
