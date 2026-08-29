import { observer } from 'mobx-react-lite';

import { languages, type Locale } from '../../locales';
import { useRootStore } from '../../stores/react/store-context';
import { useTranslation } from '../../stores/react/use-translation';
import { EyebrowLabel } from '../EyebrowLabel';

export type GuestLanguageHeroProps = {
	onSelectLanguage: (locale: Locale) => void;
};

/** The welcome banner, and the language picker a first-time visitor sees before anything else. */
export const GuestLanguageHero = observer(function GuestLanguageHero({
	onSelectLanguage,
}: GuestLanguageHeroProps) {
	const t = useTranslation();
	const { translations } = useRootStore();
	const locale = translations.locale;

	return (
		<div className="hero">
			<EyebrowLabel label={t.compassionFood} />
			<h1>{t.welcome}</h1>
			<p className="hero-copy">{t.heroCopy}</p>
			<section className="language-selector" aria-label={t.language}>
				<p>{t.languagePrompt}</p>
				<div className="language-list" role="group" aria-label={t.languagePrompt}>
					{languages.map((language) => (
						<button
							key={language.code}
							className={`language-option${locale === language.code ? ' active' : ''}`}
							type="button"
							aria-pressed={locale === language.code}
							onClick={() => onSelectLanguage(language.code)}
						>
							{language.label}
						</button>
					))}
				</div>
			</section>
		</div>
	);
});
