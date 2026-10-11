import { observer } from 'mobx-react-lite';

import { languages } from '../../locales';
import { useRootStore } from '../../stores/react/store-context';
import { useTranslation } from '../../stores/react/use-translation';
import { useLanguageChoice } from '../hooks/use-language-choice';
import { TranslateIcon } from '../ui/icons/TranslateIcon';

/**
 * A first-time visitor's one-time introduction: a short welcome and the language question. It is
 * not the home screen — choosing a language dismisses it for good, folding it into the app bar's
 * language picker — so it stays compact enough that the screen it sits on shows beneath it.
 */
export const GuestLanguageHero = observer(function GuestLanguageHero() {
	const t = useTranslation();
	const { translations } = useRootStore();
	const chooseLanguage = useLanguageChoice();
	const locale = translations.locale;

	return (
		// Shares its view-transition name with the app bar picker, which takes it over on dismissal.
		<div className="hero" style={{ viewTransitionName: 'language-picker' }}>
			<h1>{t.welcome}</h1>
			<section className="language-selector" aria-label={t.language}>
				<p className="language-prompt">{t.languagePrompt}</p>
				<div className="language-list" role="group" aria-label={t.languagePrompt}>
					{languages.map((language) => (
						<button
							key={language.code}
							className={`language-option${locale === language.code ? ' active' : ''}`}
							type="button"
							aria-pressed={locale === language.code}
							onClick={() => chooseLanguage(language.code)}
						>
							{language.label}
						</button>
					))}
				</div>
				{/* The same icon the app bar picker shows, so the guest learns what to look for. */}
				<p className="language-hint">
					<TranslateIcon aria-hidden="true" />
					<span>{t.guestView.languageHint}</span>
				</p>
			</section>
		</div>
	);
});
