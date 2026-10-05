import { keyframes } from '@emotion/react';
import styled from '@emotion/styled';
import type { CSSProperties } from 'react';

import { languages } from '../../locales';
import { useKioskLanguages } from './kiosk-languages';

const drain = keyframes`
	from { transform: scaleX(1); }
	to { transform: scaleX(0); }
`;

const Row = styled.ol`
	display: flex;
	flex-wrap: wrap;
	justify-content: center;
	gap: 1.2vmin;
	margin: 0;
	padding: 0;
	list-style: none;

	li {
		padding: 0.6vmin 1.8vmin;
		border: 0.3vmin solid rgb(255 255 255 / 35%);
		border-radius: var(--radius-pill);
		color: rgb(255 255 255 / 55%);
		font-size: clamp(0.9rem, 2.4vmin, 1.9rem);
		font-weight: 500;
		line-height: 1.2;
		letter-spacing: normal;
		font-synthesis: weight;
		transition:
			background 0.3s,
			color 0.3s,
			border-color 0.3s;
	}

	li[data-active] {
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
	   the way the carousel advances, so its edge moves toward the language that comes next. A pale tint
	   of the brand teal, so it reads as a quiet countdown rather than competing with the amber
	   number tiles, and the dark label keeps its contrast on the tint and the white alike. It
	   starts as the pill appears, set back by however much of the turn had already gone. Left in
	   under reduced motion: it is slow, linear, and the only sign of when the language will change. */
	li[data-active]::before {
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

/**
 * The carousel dots for the rotating language: every language by its own name, in its own script,
 * with the one showing now filled in and a band across it draining as its turn runs out. Own names
 * rather than flags — a flag names a country, and Spanish, Arabic, Chinese, Farsi, and Vietnamese
 * each map onto several, some of them contested.
 *
 * Hidden from screen readers: it repeats which language the copy is in, which `lang` already says.
 */
export function LanguageIndicator() {
	const { secondary, rotation, turn } = useKioskLanguages();

	if (rotation.length < 2) {
		return null;
	}
	const countdown = turn
		? ({
				'--turn-ms': `${turn.durationMs}ms`,
				'--turn-delay': `${-turn.elapsedMs}ms`,
			} as CSSProperties)
		: undefined;

	return (
		<Row aria-hidden="true">
			{rotation.map((locale) => {
				const active = locale === secondary?.locale;

				return (
					<li
						key={locale}
						lang={locale}
						data-active={active || undefined}
						style={active ? countdown : undefined}
					>
						{names.get(locale)}
					</li>
				);
			})}
		</Row>
	);
}
