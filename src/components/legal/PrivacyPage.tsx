import { observer } from 'mobx-react-lite';
import { useNavigate } from 'react-router';

import { useTranslation } from '../../stores/react/use-translation';
import { LegalDocumentView } from './LegalDocumentView';
import privacyMarkdown from './privacy.md?raw';

/** The privacy document, as its own route. */
export const PrivacyPage = observer(function PrivacyPage() {
	const t = useTranslation();
	const navigate = useNavigate();

	return (
		<LegalDocumentView
			backLabel={t.backToGuest}
			markdown={privacyMarkdown}
			onBack={() => void navigate('/')}
		/>
	);
});
