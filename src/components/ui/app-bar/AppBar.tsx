import { observer } from 'mobx-react-lite';
import type { ChangeEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';

import { languages } from '../../../locales';
import { useRootStore } from '../../../stores/react/store-context';
import { useTranslation } from '../../../stores/react/use-translation';
import type { Language } from '../../../stores/translation.store';

/**
 * The bar across the top of every screen: the mark, the language picker, and the guest/admin
 * toggle. Its styles live in `app-shell.css` rather than here, since the shell they belong to is
 * shared with the layout around it.
 */
export const AppBar = observer(function AppBar() {
	const t = useTranslation();
	const { guest, translations } = useRootStore();
	const navigate = useNavigate();
	const isAdmin = useLocation().pathname.startsWith('/admin');

	function setLocale(event: ChangeEvent<HTMLSelectElement>) {
		translations.setLanguage(event.target.value as Language);
	}

	return (
		<header className="topbar">
			<Link className="brand" to="/">
				<img className="brand-mark" src="/bay-compassion-logo.png" alt="" />
				<span>{t.marketName}</span>
			</Link>
			<div className="header-actions">
				{guest.isReturningVisitor ? (
					<label className="language-picker">
						<span className="sr-only">{t.language}</span>
						<select value={translations.locale} aria-label={t.language} onChange={setLocale}>
							{languages.map((language) => (
								<option key={language.code} value={language.code}>
									{language.label}
								</option>
							))}
						</select>
					</label>
				) : null}
				<button
					className="mode-button"
					type="button"
					onClick={() => void navigate(isAdmin ? '/' : '/admin')}
				>
					<svg
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						aria-hidden="true"
					>
						<path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0" />
					</svg>
					{isAdmin ? t.guest : t.admin}
				</button>
			</div>
		</header>
	);
});
