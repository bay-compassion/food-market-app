import styled from '@emotion/styled';
import { Button, Checkbox, FormControlLabel, Link } from '@mui/material';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';

import { useRootStore } from '../../../stores/react/store-context';
import { useTranslation } from '../../../stores/react/use-translation';

const Consent = styled.div`
	display: grid;
	gap: 18px;
`;

const Enabled = styled.p`
	margin: 0;
	font-weight: 700;
`;

const LegalLinks = styled.div`
	display: flex;
	justify-content: space-around;
	align-items: flex-start;
	gap: 16px;
	font-size: 14px;

	a {
		min-width: 0;
	}
`;

const SubmissionError = styled.p`
	color: var(--color-error);
	font-size: 13px;
	line-height: 1.4;
`;

/**
 * The SMS opt-in: the full consent language, a checkbox, and the button it gates.
 *
 * Consent belongs to the guest rather than a visit, so this is deliberately explicit — having a
 * phone number on file is not consent to be texted.
 */
export const NotificationOptIn = observer(function NotificationOptIn() {
	const t = useTranslation();
	const { guest } = useRootStore();
	const [smsConsent, setSmsConsent] = useState(false);

	useEffect(() => {
		void guest.loadNotificationSettings();
	}, [guest]);

	if (!guest.smsConfigured) {
		return <Consent className="notification-consent" />;
	}

	return (
		<Consent className="notification-consent">
			{guest.smsState === 'enabled' ? (
				<Enabled className="notification-enabled">{t.smsEnabled}</Enabled>
			) : (
				<>
					<FormControlLabel
						className="sms-consent"
						control={
							<Checkbox
								checked={smsConsent}
								onChange={(event) => setSmsConsent(event.target.checked)}
							/>
						}
						label={t.smsConsentLabel}
					/>
					<LegalLinks className="notification-legal-links">
						<Link href="/privacy">{t.privacyPolicy}</Link>
						<Link href="/terms">{t.termsAndConditions}</Link>
					</LegalLinks>
					<Button
						disabled={!smsConsent || guest.smsState === 'enabling'}
						onClick={() => void guest.enableSmsNotifications(smsConsent)}
					>
						{t.smsEnable}
					</Button>
					{guest.smsState === 'error' ? (
						<SubmissionError className="submission-error" role="alert">
							{t.smsError}
						</SubmissionError>
					) : null}
				</>
			)}
		</Consent>
	);
});
