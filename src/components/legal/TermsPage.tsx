import { observer } from 'mobx-react-lite';
import { useNavigate } from 'react-router';

import { useTranslation } from '../../stores/react/use-translation';
import { LegalDocumentView } from './LegalDocumentView';
import termsMarkdown from './terms.md?raw';

/** The terms document, as its own route. */
export const TermsPage = observer(function TermsPage() {
	const t = useTranslation();
	const navigate = useNavigate();

	return (
		<LegalDocumentView
			backLabel={t.backToGuest}
			markdown={termsMarkdown}
			onBack={() => void navigate('/')}
		/>
	);
});
