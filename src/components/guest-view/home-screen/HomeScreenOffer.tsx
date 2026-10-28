import styled from '@emotion/styled';
import { Button } from '@mui/material';
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';

import { useRootStore } from '../../../stores/react/store-context';
import { useTranslation } from '../../../stores/react/use-translation';
import { useHomeScreenInstallEnabled } from '../../hooks/use-home-screen-install-enabled';
import { HomeScreenInstructions } from './HomeScreenInstructions';

const Offer = styled.aside`
	margin-top: 24px;
	padding: 20px 0;
	border-top: 1px solid var(--color-border);
	h2 {
		margin: 0 0 8px;
		font-size: 20px;
		line-height: 1.3;
	}
	p {
		margin: 0 0 16px;
		color: var(--color-text-muted);
		font-size: 16px;
		line-height: 1.55;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
`;

/** A quiet optional next step, outside the visit card's live status announcements. */
export const HomeScreenOffer = observer(function HomeScreenOffer() {
	const { installation, notifications, visit } = useRootStore();
	const copy = useTranslation().guestView.homeScreen;
	const enabled = useHomeScreenInstallEnabled(installation.platform);

	useEffect(() => {
		if (!enabled) {
			installation.closeInstructions();
		}
	}, [enabled, installation]);

	if (!enabled || visit.status !== 'registered' || !installation.canOffer) {
		return null;
	}

	async function install() {
		if (!(await installation.install())) {
			notifications.error(copy.failed);
		}
	}

	return (
		<>
			<Offer aria-label={copy.heading}>
				<h2>{copy.heading}</h2>
				<p>{copy.description}</p>
				<div className="actions">
					<Button disabled={installation.isInstalling} onClick={() => void install()}>
						{copy.add}
					</Button>
					<Button variant="text" onClick={() => installation.dismiss()}>
						{copy.notNow}
					</Button>
				</div>
			</Offer>
			<HomeScreenInstructions />
		</>
	);
});
