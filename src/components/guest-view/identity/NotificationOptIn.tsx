import styled from '@emotion/styled';
import { Button, Checkbox, FormControlLabel, Link } from '@mui/material';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';

import { formatUsPhone } from '../../../services/phoneFormat';
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

const OptOutInstructions = styled.div`
	display: grid;
	gap: 14px;

	p {
		margin: 0;
		line-height: 1.5;
	}
`;

const SenderPhone = styled.strong`
	display: block;
	font-size: 18px;
	text-align: center;
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
	const [checkingStart, setCheckingStart] = useState(false);
	const [checkFailed, setCheckFailed] = useState(false);
	const copy = t.guestView.notificationOptIn;

	useEffect(() => {
		void guest.loadNotificationSettings();
	}, [guest]);

	if (!guest.smsConfigured && !guest.smsOptOutSender) {
		return <Consent className="notification-consent" />;
	}

	const checkStart = async () => {
		setCheckingStart(true);
		setCheckFailed(false);

		try {
			await guest.refreshNotificationSettings();
		} catch {
			setCheckFailed(true);
		} finally {
			setCheckingStart(false);
		}
	};

	return (
		<Consent className="notification-consent">
			{guest.smsState === 'enabled' ? (
				<Enabled className="notification-enabled">{copy.enabled}</Enabled>
			) : guest.smsOptOutSender ? (
				<OptOutInstructions className="sms-opt-out-instructions">
					<p>{copy.optedOut}</p>
					<SenderPhone>
						<bdi dir="ltr">{formatUsPhone(guest.smsOptOutSender)}</bdi>
					</SenderPhone>
					<Button
						component="a"
						href={`sms:${guest.smsOptOutSender}?body=START`}
						variant="contained"
					>
						{copy.sendStart}
					</Button>
					<Button disabled={checkingStart} onClick={() => void checkStart()}>
						{copy.checkStart}
					</Button>
					{checkFailed ? (
						<SubmissionError className="submission-error" role="alert">
							{copy.error}
						</SubmissionError>
					) : null}
				</OptOutInstructions>
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
						label={copy.consentLabel}
					/>
					<LegalLinks className="notification-legal-links">
						<Link href="/privacy">{t.privacyPolicy}</Link>
						<Link href="/terms">{t.termsAndConditions}</Link>
					</LegalLinks>
					<Button
						disabled={!smsConsent || guest.smsState === 'enabling'}
						onClick={() => void guest.enableSmsNotifications(smsConsent)}
					>
						{copy.enable}
					</Button>
					{guest.smsState === 'error' ? (
						<SubmissionError className="submission-error" role="alert">
							{copy.error}
						</SubmissionError>
					) : null}
				</>
			)}
		</Consent>
	);
});
