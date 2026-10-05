import { keyframes } from '@emotion/react';
import styled from '@emotion/styled';
import type { CSSProperties } from 'react';

import { languages, type Locale } from '../../locales';

const drain = keyframes`
	from { transform: scaleX(1); }
	to { transform: scaleX(0); }
`;

const Pill = styled.li`
	padding: 0.6vmin 1.8vmin;
	border: 0.3vmin solid rgb(255 255 255 / 35%);
	border-radius: var(--radius-pill);
	color: rgb(255 255 255 / 55%);
	font-size: clamp(0.9rem, 2.4vmin, 1.9rem);
	font-weight: 500;
	line-height: 1.2;
	/* Spacing letters apart breaks Arabic and Farsi's joined script. */
	letter-spacing: normal;
	font-synthesis: weight;
	transition:
		background 0.3s,
		color 0.3s,
		border-color 0.3s;

	&[data-active] {
		position: relative;
		/* Keeps the band below the label without escaping the pill. */
		isolation: isolate;
		overflow: hidden;
		border-color: var(--color-on-brand);
		background: var(--color-on-brand);
		color: var(--color-brand-dark);
		font-weight: 700;
	}

	/* The time this language has left: a band that drains toward the end of the pill — rightward,
	   the way the carousel advances, so its edge moves toward the language that comes next. A pale
	   tint of the brand teal, so it reads as a quiet countdown rather than competing with the amber
	   number tiles, and the dark label keeps its contrast on the tint and the white alike. It starts
	   as the pill becomes active, set back by however much of the turn had already gone. Left in
	   under reduced motion: it is slow, linear, and the only sign of when the language will change. */
	&[data-counting]::before {
		content: '';
		position: absolute;
		inset: 0;
		z-index: -1;
		background: color-mix(in srgb, var(--color-brand) 22%, var(--color-on-brand));
		transform-origin: right;
		animation: ${drain} var(--turn-ms) linear var(--turn-delay) forwards;
	}
`;

const names = new Map(languages.map(({ code, label }) => [code, label]));

export type LanguagePillProps = {
	locale: Locale;
	/** The language showing now. */
	active?: boolean;
	/** The active language's turn, for its countdown band; without it the pill is simply filled. */
	turn?: { durationMs: number; elapsedMs: number } | null;
};

/**
 * One language in the kiosk's carousel, by its own name in its own script — own names rather than
 * flags, since a flag names a country, and Spanish, Arabic, Chinese, Farsi, and Vietnamese each map
 * onto several, some of them contested. The active one is filled in, with a band across it
 * draining as its turn runs out.
 *
 * Renders an `li`, so it belongs inside the indicator's list.
 */
export function LanguagePill({ locale, active = false, turn = null }: LanguagePillProps) {
	const countdown =
		active && turn
			? ({
					'--turn-ms': `${turn.durationMs}ms`,
					'--turn-delay': `${-turn.elapsedMs}ms`,
				} as CSSProperties)
			: undefined;

	return (
		<Pill
			lang={locale}
			data-active={active || undefined}
			data-counting={countdown ? true : undefined}
			style={countdown}
		>
			{names.get(locale)}
		</Pill>
	);
}
