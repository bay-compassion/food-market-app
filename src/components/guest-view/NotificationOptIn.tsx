import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';

import { useRootStore } from '../../stores/react/store-context';
import { useTranslation } from '../../stores/react/use-translation';
import { AppButton } from '../AppButton';

const Consent = styled.div`
	display: grid;
	gap: 18px;
`;

const Option = styled.div`
	display: grid;
	gap: 12px;
	padding: 18px;
	border-radius: var(--radius-md);
	background: var(--color-surface-soft);

	p {
		margin: 0;
		font-size: 14px;
	}
`;

const Enabled = styled.p`
	font-weight: 700;
`;

const ConsentLabel = styled.label`
	display: flex;
	align-items: flex-start;
	gap: 10px;

	input {
		flex: 0 0 auto;
		width: 20px;
		height: 20px;
		margin-top: 2px;
	}

	span {
		font-weight: 400;
		line-height: 1.55;
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
			<Option className="notification-option">
				{guest.smsState === 'enabled' ? (
					<Enabled className="notification-enabled">{t.smsEnabled}</Enabled>
				) : (
					<>
						<ConsentLabel className="sms-consent">
							<input
								type="checkbox"
								checked={smsConsent}
								onChange={(event) => setSmsConsent(event.target.checked)}
							/>
							<span>
								{t.smsConsentLabel} <a href="/privacy">{t.privacyPolicy}</a> ·{' '}
								<a href="/terms">{t.termsAndConditions}</a>
							</span>
						</ConsentLabel>
						<AppButton
							type="button"
							variant="secondary"
							disabled={!smsConsent || guest.smsState === 'enabling'}
							onClick={() => void guest.enableSmsNotifications(smsConsent)}
							label={t.smsEnable}
						/>
						{guest.smsState === 'error' ? (
							<SubmissionError className="submission-error" role="alert">
								{t.smsError}
							</SubmissionError>
						) : null}
					</>
				)}
			</Option>
		</Consent>
	);
});
