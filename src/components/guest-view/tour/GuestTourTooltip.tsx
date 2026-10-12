import styled from '@emotion/styled';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import { observer } from 'mobx-react-lite';
import { type KeyboardEvent, useId } from 'react';
import type { TooltipRenderProps } from 'react-joyride';

import type { Locale } from '../../../locales';
import { QueueNumber } from '../../../models/queue-number';
import { QueueNumerals } from '../../../services/queue-numerals';
import { useRootStore } from '../../../stores/react/store-context';
import { useTranslation } from '../../../stores/react/use-translation';
import { QueueStanding } from '../visit-status/QueueStanding';
import type { GuestTourStepId } from './guest-tour-steps';

const Card = styled.div`
	position: relative;
	display: grid;
	gap: 10px;
	width: min(360px, calc(100vw - 32px));
	padding: 20px 20px 16px;
	border-radius: var(--radius-md);
	color: var(--color-text);
	background: var(--color-background);
	box-shadow: 0 12px 32px rgb(1 42 47 / 0.28);
	text-align: start;
`;

/**
 * When a market-day step happens. It is the step's point as much as its title is — the guest needs
 * to know what to be doing at 10:45 — so it leads the step, not trails the step count.
 */
const Time = styled.p`
	display: inline-flex;
	align-items: center;
	justify-self: start;
	gap: 6px;
	margin: 0;
	padding: 5px 12px;
	border-radius: var(--radius-pill);
	color: var(--color-on-brand);
	background: var(--color-brand);
	font-family: var(--font-heading);
	font-size: 17px;
	font-weight: 700;

	svg {
		width: 18px;
		height: 18px;
	}
`;

const Progress = styled.span`
	color: var(--color-text-muted);
	font-size: 14px;
	font-weight: 700;
`;

const Title = styled.h2`
	margin: 0;
	padding-inline-end: 32px;
	color: var(--color-brand);
	font-family: var(--font-heading);
	font-size: 22px;
	line-height: 1.2;
`;

const Body = styled.p`
	margin: 0;
	font-size: 16px;
	line-height: 1.5;
`;

/**
 * The waiting card's own line display, at a size that fits the tooltip. `zoom` rather than a
 * transform, so the layout box shrinks with it instead of leaving the full-size gap behind.
 */
const Preview = styled.div`
	zoom: 0.6;

	.queue-standing {
		margin: 0;
	}
`;

/** A plausible line for the preview: number 12, with 9 being called and two guests between. */
const previewLine = { queueNumber: QueueNumber.main(12), guestsAhead: 2, nowCalling: 9 } as const;

const Footer = styled.div`
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
	margin-top: 6px;
`;

const Close = styled(IconButton)`
	position: absolute;
	top: 8px;
	inset-inline-end: 8px;
`;

/**
 * The languages whose tour copy writes its times in their own digits, so the step count beside a
 * time does too. Only Persian, as on the help page: the Arabic copy writes Western digits.
 */
const nativeDigitLocales: ReadonlySet<Locale> = new Set(['fa']);

/** The copy a step names other controls by, filled in from those controls' own labels. */
function useStepCopy(id: GuestTourStepId) {
	const t = useTranslation();
	const step = t.guestView.tour.steps[id];

	return {
		...step,
		body: step.body
			.replace('{submit}', t.submit)
			.replace('{action}', t.guestView.identityIndicator.notificationsAction)
			.replace('{help}', t.help.title),
	};
}

/**
 * One step of the guided tour. Joyride portals it to `<body>`, outside the `dir` that `<main>`
 * sets, so it states its own direction; and it reads its copy from the store rather than the step,
 * so the language the guest is reading stays the language the tour is in.
 */
export const GuestTourTooltip = observer(function GuestTourTooltip({
	backProps,
	closeProps,
	controls,
	index,
	isLastStep,
	primaryProps,
	size,
	skipProps,
	step,
	tooltipProps,
}: TooltipRenderProps) {
	const { tour: copy, visitStatus } = useTranslation().guestView;
	const { translations } = useRootStore();
	const id = step.data.id as GuestTourStepId;
	const { time, title, body } = useStepCopy(id);
	const titleId = useId();
	const bodyId = useId();
	const numerals = new QueueNumerals(translations.locale);
	const digits = (value: number) =>
		(nativeDigitLocales.has(translations.locale) ? numerals.nativeOf(value) : null) ??
		String(value);
	const primaryLabel = index === 0 ? copy.start : isLastStep ? copy.done : copy.next;
	const progress = copy.progress
		.replace('{current}', digits(index + 1))
		.replace('{total}', digits(size));

	// Escape ends the tour, as the close button does, rather than Joyride's default of advancing.
	function dismissOnEscape(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			event.stopPropagation();
			controls.skip('button_close');
		}
	}

	return (
		<Card
			{...tooltipProps}
			dir={translations.dir}
			lang={translations.locale}
			aria-labelledby={titleId}
			aria-describedby={bodyId}
			onKeyDown={dismissOnEscape}
		>
			{time ? (
				<Time>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
						<circle cx="12" cy="12" r="9" strokeWidth="2" />
						<path d="M12 7v5l3 2" strokeWidth="2" strokeLinecap="round" />
					</svg>
					{time}
				</Time>
			) : null}
			<Title id={titleId}>{title}</Title>
			<Body id={bodyId}>{body}</Body>
			{/*
				Whatever the line position flag selects, so the tour previews the display this guest's
				screen will actually show. Inert and hidden: the now-calling board is a live region,
				and a picture of it must not announce itself.
			*/}
			{id === 'line' ? (
				<Preview aria-hidden="true" inert>
					<QueueStanding copy={visitStatus} {...previewLine} />
				</Preview>
			) : null}
			<Footer>
				{index === 0 ? (
					<Button {...skipProps} variant="text">
						{copy.skip}
					</Button>
				) : (
					<Button {...backProps} variant="text">
						{copy.back}
					</Button>
				)}
				<Progress>{progress}</Progress>
				{/* Named for what it says: the first step's button reads "Show me", not Joyride's "Next". */}
				<Button
					{...primaryProps}
					aria-label={primaryLabel}
					title={primaryLabel}
					variant="contained"
				>
					{primaryLabel}
				</Button>
			</Footer>
			<Close {...closeProps} size="small">
				<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
					<path
						d="M6 6l12 12M18 6 6 18"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
					/>
				</svg>
			</Close>
		</Card>
	);
});
