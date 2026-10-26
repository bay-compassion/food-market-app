import styled from '@emotion/styled';
import { Button } from '@mui/material';
import { observer } from 'mobx-react-lite';
import { useEffect, useId, useState } from 'react';

import { adminTranslations } from '../../adminLocales';
import { PageVisibilityPoller } from '../../services/page-visibility-poller';
import { useRootStore } from '../../stores/react/store-context';
import { printStationLaunchCommand, printStationUrl } from '../print-station/PrintStationSetup';

/** How often the card looks again at whether the station is checking in. */
const checkIntervalMs = 15_000;

const guideUrl =
	'https://github.com/bay-compassion/food-market-app/blob/main/docs/name-tag-printing.md';

const Card = styled.section`
	display: grid;
	gap: 14px;

	.heading {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
	}

	h2,
	h3,
	p,
	ol {
		margin: 0;
	}

	h3 {
		font-size: 16px;
	}

	p,
	li {
		color: var(--color-text-subtle);
		line-height: 1.5;
	}

	.status {
		padding: 4px 10px;
		border-radius: var(--radius-pill);
		background: var(--color-surface-soft);
		font-size: 13px;
		font-weight: 700;
		white-space: nowrap;
	}

	.status[data-online='true'] {
		color: var(--color-success);
	}

	.status[data-online='false'] {
		color: var(--color-error);
	}

	.open-hint {
		margin-top: -6px;
		font-size: 13px;
		text-align: center;
	}

	ol {
		display: grid;
		gap: 8px;
		padding-inline-start: 22px;
	}

	.command {
		display: grid;
		gap: 8px;
		justify-items: start;
	}

	.command-label {
		font-size: 13px;
		font-weight: 700;
	}

	pre {
		justify-self: stretch;
		margin: 0;
		padding: 10px 12px;
		border-radius: var(--radius-sm);
		background: var(--color-surface-soft);
		font-size: 12px;
		line-height: 1.45;
		white-space: pre-wrap;
		word-break: break-all;
	}

	.account {
		font-size: 14px;
	}

	.account a {
		color: var(--color-brand);
		font-weight: 700;
	}
`;

/**
 * How to set up the computer the label printer is plugged into, the way to open its page, and
 * whether it is checking in right now. A coordinator typically signs in to the dashboard on that
 * computer first and opens the station from here. The station itself shows the launch command too;
 * this is where a coordinator finds it before that computer is running anything.
 *
 * Whatever device opens the station becomes it and takes the tags, so the hint under the button
 * says which computer it belongs on.
 */
export const PrintStationCard = observer(function PrintStationCard() {
	const t = adminTranslations.en.printStationCard;
	const { admin, notifications } = useRootStore();
	const [copied, setCopied] = useState(false);
	const commandId = useId();
	const online = admin.printStationOnline;

	useEffect(() => {
		const poller = new PageVisibilityPoller(
			() => void admin.checkPrintStation(),
			checkIntervalMs,
			() => {},
		);

		poller.start();

		return () => poller.stop();
	}, [admin]);

	async function copy() {
		try {
			await navigator.clipboard.writeText(printStationLaunchCommand);
			setCopied(true);
		} catch {
			notifications.error(t.copyFailed);
		}
	}

	return (
		<Card className="admin-section print-station-card">
			<div className="heading">
				<h2>{t.title}</h2>
				{online === null ? null : (
					<span className="status" data-online={online} role="status">
						{online ? t.online : t.offline}
					</span>
				)}
			</div>
			<p>{t.intro}</p>
			<Button variant="contained" href={printStationUrl} target="_blank" rel="noopener" fullWidth>
				{t.open}
			</Button>
			<p className="open-hint">{t.openHint}</p>

			<h3>{t.setupTitle}</h3>
			<ol>
				{t.steps.map((step) => (
					<li key={step}>{step}</li>
				))}
			</ol>

			<div className="command">
				<p className="command-label" id={commandId}>
					{t.commandLabel}
				</p>
				<pre aria-labelledby={commandId}>{printStationLaunchCommand}</pre>
				<Button variant="outlined" onClick={() => void copy()}>
					{copied ? t.copied : t.copy}
				</Button>
			</div>

			<p className="account">
				{t.account}{' '}
				<a href={guideUrl} target="_blank" rel="noopener">
					{t.guide}
				</a>
			</p>
		</Card>
	);
});
