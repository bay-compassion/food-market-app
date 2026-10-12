/**
 * Builds the reel page from `reel.src.html`: the guest copy straight from `src/locales.ts`, the logo
 * and wordmark from `public/`, and the soundtrack, all inlined so the page is a single file.
 *
 * Every placeholder is replaced on its own line, so line numbers in the built page match the source
 * — which is what lets the `#dev` beat list point at lines in `reel.src.html`.
 *
 *   node docs/reel/build.mjs
 *
 * Writes `out/market-day-reel.html` (open it in a browser) and `out/market-day-reel.artifact.html`
 * (the same page without its document shell, for publishing as a claude.ai Artifact).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const here = (path) => new URL(path, import.meta.url);
const { translations } = await import(here('../../src/locales.ts'));

/** Only the copy the reel's three screens show, per language. */
function reelStrings(t) {
	const visit = t.guestView.visitStatus;

	return {
		welcome: t.welcome,
		languagePrompt: t.languagePrompt,
		info: t.guestView.forms.informationLegend,
		firstName: t.firstName,
		lastName: t.lastName,
		phone: t.phone,
		submit: t.signupView?.submit,
		yourNumber: visit.yourNumberLabel,
		joinLottery: t.submit,
		closesIn: t.registrationClosesIn,
		registered: visit.registered.header,
		registeredDetails: visit.registered.details,
		notPlaced: visit.not_placed.header,
		notPlacedDetails: visit.not_placed.details,
		waiting: visit.waiting.header,
		waitingDetails: visit.waiting.details,
		nowCallingLabel: visit.waiting.nowCallingLabel,
		none: visit.waiting.nowCallingNone,
		called: visit.called.header,
		calledDetails: visit.called.details,
		late: visit.called.detailsLate,
		served: visit.served.header,
		servedDetails: visit.served.details,
		marketName: t.marketName,
		kiosk: {
			none: t.kiosk.nowCallingNone,
			nowCalling: t.kiosk.nowCalling,
			still: t.kiosk.stillWaitingFor,
			waitingCount: t.kiosk.waitingCount,
		},
	};
}

const strings = Object.fromEntries(
	Object.entries(translations).map(([locale, t]) => [locale, reelStrings(t)]),
);
const png = (path) => 'data:image/png;base64,' + readFileSync(here(path)).toString('base64');
const soundtrack = existsSync(here('./soundtrack.m4a'))
	? readFileSync(here('./soundtrack.m4a')).toString('base64')
	: '';

const page = readFileSync(here('./reel.src.html'), 'utf8')
	.replaceAll('__WORDMARK__', png('../../public/wordmark.png'))
	.replaceAll('__LOGO__', png('../../public/bay-compassion-logo.png'))
	.replace('__SOUNDTRACK__', soundtrack)
	.replace('__STRINGS__', JSON.stringify(strings));

mkdirSync(here('./out'), { recursive: true });
writeFileSync(here('./out/market-day-reel.artifact.html'), page);
// The shell goes on the page's first line, so the source's line numbers still hold.
writeFileSync(
	here('./out/market-day-reel.html'),
	'<!doctype html><html lang="en"><head><meta charset="utf-8">' +
		'<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">' +
		'</head><body>' +
		page +
		'</body></html>',
);
console.log(`Built out/market-day-reel.html (${Math.round(page.length / 1024)} KB)`);
