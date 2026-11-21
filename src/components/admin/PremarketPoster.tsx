import { useNavigate } from 'react-router';

import { adminTranslations } from '../../adminLocales';
import { premarketUrl } from '../../services/premarket';
import { QrPoster } from '../QrPoster';

/**
 * The premarket's printable poster: the code volunteers scan to check in, laid out like the guest
 * poster on `/qr-code`. Staff text, so not localized.
 */
export function PremarketPoster() {
	const t = adminTranslations.en.today;
	const navigate = useNavigate();

	return (
		<QrPoster
			url={premarketUrl(window.location.origin)}
			title={t.premarketPosterTitle}
			description={t.premarketPosterDescription}
			imageAlt={t.premarketCode}
			backLabel={t.backToToday}
			onBack={() => void navigate('/admin/current-session')}
			printLabel={t.print}
		/>
	);
}
