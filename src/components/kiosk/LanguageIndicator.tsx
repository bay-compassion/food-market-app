import styled from '@emotion/styled';

import { languages } from '../../locales';
import { useKioskLanguages } from './kiosk-languages';

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
		border-color: var(--color-on-brand);
		background: var(--color-on-brand);
		color: var(--color-brand-dark);
		font-weight: 700;
	}
`;

const names = new Map(languages.map(({ code, label }) => [code, label]));

/**
 * The carousel dots for the rotating language: every language by its own name, in its own script,
 * with the one showing now filled in. Own names rather than flags — a flag names a country, and
 * Spanish, Arabic, Chinese, Farsi, and Vietnamese each map onto several, some of them contested.
 *
 * Hidden from screen readers: it repeats which language the copy is in, which `lang` already says.
 */
export function LanguageIndicator() {
	const { secondary, rotation } = useKioskLanguages();

	if (rotation.length < 2) {
		return null;
	}

	return (
		<Row aria-hidden="true">
			{rotation.map((locale) => (
				<li key={locale} lang={locale} data-active={locale === secondary?.locale || undefined}>
					{names.get(locale)}
				</li>
			))}
		</Row>
	);
}
