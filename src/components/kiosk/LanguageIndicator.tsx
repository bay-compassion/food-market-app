import styled from '@emotion/styled';

import { useKioskLanguages } from './kiosk-languages';
import { LanguagePill } from './LanguagePill';

const Row = styled.ol`
	display: flex;
	flex-wrap: wrap;
	justify-content: center;
	gap: 1.2vmin;
	margin: 0;
	padding: 0;
	list-style: none;
`;

/**
 * The carousel dots for the rotating language: a `LanguagePill` for each, in turn order, with the
 * one showing now active and counting down its turn.
 *
 * Hidden from screen readers: it repeats which language the copy is in, which `lang` already says.
 */
export function LanguageIndicator() {
	const { secondary, rotation, turn } = useKioskLanguages();

	if (rotation.length < 2) {
		return null;
	}

	return (
		<Row aria-hidden="true">
			{rotation.map((locale) => (
				<LanguagePill
					key={locale}
					locale={locale}
					active={locale === secondary?.locale}
					turn={turn}
				/>
			))}
		</Row>
	);
}
