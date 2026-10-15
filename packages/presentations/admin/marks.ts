/**
 * The things on the admin dashboard a guide's narration points at and taps, found on the screen as
 * it is now. Most are found by the dashboard's own English copy (`adminLocales.ts`) — a tab, a
 * button, a heading, a field's label — so a mark keeps working when the markup around it changes,
 * and fails by name when the thing it names is gone. Only a few have no words of their own to
 * find them by, and use the component's role or class instead.
 */
import { adminTranslations } from '../../../src/adminLocales.ts';
import type { AdminView } from '../../../src/services/admin-views.ts';
import type { AdminMark } from './scene.ts';

const t = adminTranslations.en;

const text = (element: Element) => element.textContent?.replace(/\s+/g, ' ').trim() ?? '';

/** The first element under `root` matching `selector` whose own words are `label`. */
function labelled(root: ParentNode | null, selector: string, label: string): HTMLElement | null {
	for (const element of root?.querySelectorAll<HTMLElement>(selector) ?? []) {
		const words = text(element);

		// A leading symbol — "+ Add guest" — is the button's decoration, not its label.
		if (words === label || words.replace(/^\W+\s*/, '') === label) {
			return element;
		}
	}

	return null;
}

/** The section a heading heads: the nearest `.admin-section`, or the heading itself. */
function headed(doc: Document, label: string): HTMLElement | null {
	// A list's heading carries its count after its title: "Registered 16".
	const heading = [...doc.querySelectorAll<HTMLElement>('h1, h2, h3')].find(
		(element) => text(element).replace(/\s*\d+$/, '') === label,
	);

	return heading?.closest<HTMLElement>('.admin-section, .queue-section') ?? heading ?? null;
}

/** A form field by its label, as the whole field: its MUI control, or the `<label>` around it. */
function field(doc: Document, label: string): HTMLElement | null {
	for (const element of doc.querySelectorAll<HTMLElement>('label')) {
		// A label wrapped around its field holds what is typed in it too; only its own words count.
		const words = [...element.childNodes]
			.filter((node) => !(node instanceof Element && node.matches('input, textarea, select')))
			.map((node) => node.textContent ?? '')
			.join(' ')
			.replace(/\s+/g, ' ')
			.trim();

		if (words === label || words === `${label} *`) {
			return (
				element.closest<HTMLElement>('.MuiFormControl-root, .MuiTextField-root') ??
				(element.querySelector('input, textarea, select') ? element : element.parentElement)
			);
		}
	}

	return null;
}

/** The open confirmation sheet. */
const sheet = (doc: Document) => doc.querySelector<HTMLElement>('[role="alertdialog"]');

/** The element a mark names on the screen as it is now, or `null` when it isn't showing. */
export function markTarget(mark: AdminMark, doc: Document): HTMLElement | null {
	const [kind, key] = mark.split(':') as [string, keyof typeof t | undefined];
	const value = key ? t[key] : undefined;
	const copy = typeof value === 'string' ? value : '';

	switch (kind) {
		case 'tab':
			return labelled(doc, '[role="tab"]', tabLabels[key as unknown as AdminView]);
		case 'button':
			return labelled(doc, 'button', copy);
		case 'heading':
			return headed(doc, copy);
		case 'field':
			return field(doc, copy);
		case 'labelled':
			return doc.querySelector<HTMLElement>(`[aria-label="${CSS.escape(copy)}"]`);
		case 'sheet':
			return key ? labelled(sheet(doc), 'button', copy) : sheet(doc);
		case 'status':
			return doc.querySelector('.event-state');
		case 'step':
			return doc.querySelector('[aria-current="step"]');
		case 'timer':
			return doc.querySelector('[role="timer"]');
		case 'dialog':
			return doc.querySelector('[role="dialog"]');
		case 'reset':
			return doc.querySelector('.reset-card');
		case 'overview':
			return doc.querySelector('.progress-card');
		case 'call-next':
			return doc.querySelector('.call-next');
		case 'feedback':
			return doc.querySelector('.admin-feedback');
		case 'row':
			return doc.querySelector<HTMLElement>(`[role="row"][data-rowindex="${Number(key)}"]`);
		// The guest database's search box, in the grid's own toolbar.
		case 'search':
			return (
				doc
					.querySelector('.MuiDataGrid-root [role="searchbox"]')
					?.closest<HTMLElement>('.MuiFormControl-root') ?? null
			);
		case 'history':
			return doc.querySelector('.history-list');
		case 'report':
			return doc.querySelector('.report-scroll');
		default:
			return null;
	}
}

/** Each screen's tab, as `AdminDashboardLayout` labels it. */
const tabLabels: Record<AdminView, string> = {
	'current-session': t.currentSession,
	schedule: t.schedule,
	queue: t.queue,
	broadcast: t.broadcastTitle,
	'question-bank': t.questionBank,
	'guest-database': t.guestDatabase,
	'session-history': t.historySessions,
	reports: t.reports,
	'dev-mode': t.devMode,
};

/**
 * Brings a tab into the navigation strip's view before the narration points at it: on a phone the
 * strip scrolls sideways, and a tab past its edge is still there to tap but not to see.
 */
export function revealTab(target: HTMLElement | null): void {
	const strip = target?.closest<HTMLElement>('.MuiTabs-scroller');

	if (target && strip) {
		strip.scrollLeft = target.offsetLeft - (strip.clientWidth - target.offsetWidth) / 2;
	}
}

/**
 * Scrolls a dialog's own content so `target` shows: a dialog scrolls inside itself, over the page,
 * so scrolling the page under the bar would not bring it into view.
 */
export function revealInDialog(target: HTMLElement | null): void {
	const content = target?.closest('[role="dialog"]')
		? target.closest<HTMLElement>('.MuiDialogContent-root')
		: null;

	if (target && content) {
		const top =
			target.getBoundingClientRect().top - content.getBoundingClientRect().top + content.scrollTop;

		content.scrollTop = top - (content.clientHeight - target.offsetHeight) / 2;
	}
}
