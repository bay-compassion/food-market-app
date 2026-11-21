import { observer } from 'mobx-react-lite';
import { useNavigate } from 'react-router';

import { useTranslation } from '../stores/react/use-translation';
import { QrPoster } from './QrPoster';

/**
 * The printable poster that points guests at the app. This is a route component, so it reads its
 * own text and does its own navigating rather than taking either as props — the same shape as the
 * legal pages next door.
 */
export const QrCodeView = observer(function QrCodeView() {
	const t = useTranslation();
	const navigate = useNavigate();

	return (
		<QrPoster
			url={`${window.location.origin}/`}
			title={t.qrCodeTitle}
			description={t.qrCodeDescription}
			imageAlt={t.qrCodeImageAlt}
			backLabel={t.backToGuest}
			onBack={() => void navigate('/')}
			printLabel={t.qrCodePrint}
		/>
	);
});
