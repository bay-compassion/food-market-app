import styled from '@emotion/styled';
import { Button } from '@mui/material';
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import { useNavigate } from 'react-router';

import { useRootStore } from '../../../stores/react/store-context';
import { useTranslation } from '../../../stores/react/use-translation';
import { Alert } from '../../ui/alerts/Alert';
import { Card } from '../../ui/layout/Card';

const Content = styled.div`
	display: grid;
	gap: 18px;

	h2 {
		margin: 0;
		font-family: var(--font-heading);
		font-size: 29px;
		letter-spacing: -0.01em;
		text-transform: uppercase;
		color: var(--color-text);
	}

	p {
		margin: 0;
		color: var(--color-text-muted);
		font-size: 16px;
		line-height: 1.55;
	}

	.alert {
		margin-bottom: 0;
	}

	.claim-error {
		color: var(--color-error);
		font-size: 14px;
	}
`;

export type GuestClaimCardProps = {
	/** The code from the worker's QR code, or `null` when the link arrived without one. */
	token: string | null;
};

/**
 * Puts a guest a worker added by hand onto this phone, from the code in the worker's QR code.
 *
 * Nothing is claimed until the guest taps. The code is single-use, so redeeming it on render would
 * spend it on a link preview or a second render — and would replace whatever this phone already
 * holds before the guest had seen the warning about it.
 */
export const GuestClaimCard = observer(function GuestClaimCard({ token }: GuestClaimCardProps) {
	const t = useTranslation().claimView;
	const { claim } = useRootStore();
	const navigate = useNavigate();

	// The claim store lives as long as the app, so a new code must not open on an old failure.
	useEffect(() => {
		claim.reset();
	}, [claim, token]);

	async function redeem() {
		if (token && (await claim.redeem(token))) {
			void navigate('/', { replace: true });
		}
	}

	return (
		<Card aria-live="polite">
			<Content>
				<h2>{t.title}</h2>
				{token ? (
					<>
						<p>{t.description}</p>
						{claim.replacesExistingData ? (
							<Alert severity="warning" heading={t.replaceHeading} body={t.replaceWarning} />
						) : null}
						{claim.state === 'failed' ? (
							<p className="claim-error" role="alert">
								{t.failed}
							</p>
						) : null}
						<Button fullWidth disabled={claim.state === 'claiming'} onClick={() => void redeem()}>
							{claim.state === 'claiming' ? t.submitting : t.submit}
						</Button>
					</>
				) : (
					<p role="alert">{t.missingCode}</p>
				)}
			</Content>
		</Card>
	);
});
