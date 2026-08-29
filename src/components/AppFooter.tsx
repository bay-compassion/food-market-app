import { observer } from 'mobx-react-lite';
import { Link } from 'react-router';

import { useTranslation } from '../stores/react/use-translation';

/** The legal links at the bottom of every screen. */
export const AppFooter = observer(function AppFooter() {
	const t = useTranslation();

	return (
		<footer className="app-footer">
			<Link to="/privacy">{t.privacyPolicy}</Link>
			<span className="app-footer-divider" aria-hidden="true">
				·
			</span>
			<Link to="/terms">{t.termsAndConditions}</Link>
		</footer>
	);
});
