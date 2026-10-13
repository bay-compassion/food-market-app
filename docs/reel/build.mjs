/**
 * Builds a video's page from its source: the shared stage (`stage.css`, `stage.js`), the guest copy
 * straight from `src/locales.ts`, the queue desk's copy from `src/adminLocales.ts`, the logo and
 * wordmark from `public/`, the voiceover's timings, and the soundtrack, all inlined so the page is a
 * single file.
 *
 * Every placeholder is replaced on its own line — the stylesheet collapsed onto one, the stage
 * script after the page's own — so line numbers in the built page match the source, which is what
 * lets the `#dev` beat list point at lines in it.
 *
 *   node docs/reel/build.mjs                 # the market day reel
 *   node docs/reel/build.mjs queue-desk      # the queue desk training video
 *
 * Writes `out/<name>.html` (open it in a browser) and `out/<name>.artifact.html` (the same page
 * without its document shell, for publishing as a claude.ai Artifact).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

import { videoFromArgs } from './videos.mjs';

const here = (path) => new URL(path, import.meta.url);
const video = videoFromArgs();
const strict = process.argv.includes('--strict');

if (strict && !existsSync(here('./' + video.soundtrack))) {
	throw new Error(
		`Missing ${video.soundtrack}; render and commit the soundtrack before publishing.`,
	);
}

const { translations } = await import(here('../../src/locales.ts'));
const { adminTranslations } = await import(here('../../src/adminLocales.ts'));

/** Only the copy the guest phones and the room display show, per language. */
function guestStrings(t) {
	const visit = t.guestView.visitStatus;

	return {
		guide: {
			...t.guestView,
			help: t.help,
			language: t.language,
			formTitle: t.formTitle,
			formDescription: t.formDescription,
			age: t.age,
			agePlaceholder: t.agePlaceholder,
			ageRange: t.ageRange30to44,
			household: t.household,
			householdHint: t.householdHint,
			children: t.childrenCount,
			seniors: t.seniorsCount,
			privacy: t.privacy,
			submitting: t.submitting,
		},
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
		noShow: visit.no_show.header,
		noShowDetails: visit.no_show.details,
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

/** The queue desk's copy. Staff screens are English only. */
function deskStrings(t, guest) {
	return {
		...t.queueDesk,
		history: undefined,
		printStation: undefined,
		historyTitle: t.queueDesk.history.title,
		historyKinds: t.queueDesk.history.kinds,
		closeSession: t.closeSession,
		confirmCloseSession: t.confirmCloseSession,
		confirmCloseSessionOutstanding: t.confirmCloseSessionOutstanding,
		confirmContinue: t.confirmContinue,
		cancel: t.cancel,
		phoneGuest: t.phoneGuest,
		markServed: t.markServed,
		markNoShow: t.markNoShow,
		queueNotStarted: t.queueNotStarted,
		manualGuestTitle: t.manualGuestTitle,
		admissionLabel: t.admissionLabel,
		admitToQueue: t.admitToQueue,
		admitProfileOnly: t.admitProfileOnly,
		queuePlacement: t.queuePlacement,
		placeNext: t.placeNext,
		placeEnd: t.placeEnd,
		saveGuest: t.saveGuest,
		guestAdded: t.guestAdded,
		guestClaimShow: t.guestClaimShow,
		guestClaimTitle: t.guestClaimTitle,
		guestClaimInstructions: t.guestClaimInstructions,
		guestClaimDone: t.guestClaimDone,
		firstName: guest.firstName,
		lastName: guest.lastName,
		phone: guest.phone,
		statuses: {
			waiting: t.waiting,
			called: guest.guestView.visitStatus.labels.called,
			served: t.served,
			no_show: t.noShow,
			not_placed: t.notPlaced,
		},
	};
}

/**
 * The voiceover's lines with the length of each recording. A line reworded since it was recorded
 * keeps the page building, on an estimate, until `voice.mjs` records it again.
 */
async function narration() {
	if (!video.narration) {
		return [];
	}

	const { lines, voice } = await import(here('./' + video.narration));
	const timings = existsSync(here('./' + video.timings))
		? JSON.parse(readFileSync(here('./' + video.timings), 'utf8'))
		: { lines: {} };

	if (strict && !Object.entries(voice).every(([key, value]) => timings.voice?.[key] === value)) {
		throw new Error(
			`The recorded voice differs from ${video.narration}; render and commit the audio first.`,
		);
	}

	const stale = [];
	const result = lines.map((line) => {
		const recorded = timings.lines[line.id];

		if (
			recorded?.text === line.text &&
			Number.isFinite(recorded.duration) &&
			recorded.duration > 0
		) {
			return { ...line, duration: recorded.duration };
		}

		stale.push(line.id);

		return { ...line, duration: line.text.split(/\s+/).length / 2.6 };
	});

	if (stale.length) {
		if (strict) {
			throw new Error(
				`Narration needs recording for: ${stale.join(', ')}. Render and commit the audio first.`,
			);
		}

		console.warn(`Not yet recorded, so timed on an estimate: ${stale.join(', ')}.`);
		console.warn(`Run: node docs/reel/voice.mjs ${video.name}`);
	}

	return result;
}

const strings = Object.fromEntries(
	Object.entries(translations).map(([locale, t]) => [locale, guestStrings(t)]),
);
const png = (path) => 'data:image/png;base64,' + readFileSync(here(path)).toString('base64');
const soundtrack = existsSync(here('./' + video.soundtrack))
	? readFileSync(here('./' + video.soundtrack)).toString('base64')
	: '';
const stageScript = readFileSync(here('./stage.js'), 'utf8')
	.replace('__STRINGS__', JSON.stringify(strings))
	.replace('__LOCALE__', video.locale ?? 'en')
	.replace('__DESK__', JSON.stringify(deskStrings(adminTranslations.en, translations.en)))
	.replace('__LOGO__', png('../../public/bay-compassion-logo.png'))
	.replace('__SOUNDTRACK__', soundtrack);
// Collapsed onto one line, so the stylesheet takes the single line its placeholder held.
const stageStyles = readFileSync(here('./stage.css'), 'utf8').replace(/\s*\n\s*/g, ' ');

const page = readFileSync(here('./' + video.source), 'utf8')
	.replace('__STAGE_CSS__', () => stageStyles)
	.replace('__TITLE__', translations[video.locale ?? 'en'].guestView.presentation.title)
	.replaceAll('__WORDMARK__', png('../../public/wordmark.png'))
	.replace('__NARRATION__', JSON.stringify(await narration()))
	.replace('__STAGE_JS__', () => stageScript);

mkdirSync(here('./out'), { recursive: true });
writeFileSync(here(`./out/${video.name}.artifact.html`), page);
// The shell goes on the page's first line, so the source's line numbers still hold.
writeFileSync(
	here(`./out/${video.name}.html`),
	'<!doctype html><html lang="' +
		(video.locale ?? 'en') +
		'"><head><meta charset="utf-8">' +
		'<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">' +
		'</head><body>' +
		page +
		'</body></html>',
);
console.log(`Built out/${video.name}.html (${Math.round(page.length / 1024)} KB)`);
