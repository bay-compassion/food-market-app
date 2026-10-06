import styled from '@emotion/styled';
import { Button } from '@mui/material';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';

import { adminTranslations } from '../../adminLocales';
import { everyPermission, isAuth0Configured, permissionsFromToken } from '../../auth';
import { QueueDeskStore } from '../../stores/queue-desk.store';
import { useRootStore } from '../../stores/react/store-context';
import { ConfirmationDrawer } from '../ui/ConfirmationDrawer';
import { NotificationToasts } from '../ui/NotificationToasts';
import { QueueDeskProvider } from './queue-desk-context';
import { QueueLine } from './QueueLine';

export type QueueDeskProps = {
	getAccessToken: () => Promise<string>;
};

/** A phone-wide column. Outside the app shell, so it sets its own page background and type. */
export const QueueDeskFrame = styled.main`
	box-sizing: border-box;
	width: min(100%, 520px);
	min-height: 100dvh;
	margin-inline: auto;
	padding: 16px 12px;
	color: var(--color-text);
	background: var(--color-background);
	font-family: var(--font-body);
`;

const Message = styled.section`
	display: grid;
	gap: 16px;
	justify-items: start;
	padding: 32px 8px;

	p {
		margin: 0;
		color: var(--color-text-muted);
		font-size: 17px;
		line-height: 1.5;
	}
`;

/**
 * The signed-in `/queue` screen: wires the worker's token and permissions into the store, then
 * shows the line — or why it can't yet.
 *
 * It renders outside the app shell, so it mounts the confirmation sheet and the toasts itself.
 */
export const QueueDesk = observer(function QueueDesk({ getAccessToken }: QueueDeskProps) {
	const t = adminTranslations.en;
	const rootStore = useRootStore();
	const [desk] = useState(
		() =>
			new QueueDeskStore(rootStore.admin, rootStore.session, {
				notifications: rootStore.notifications,
			}),
	);

	useEffect(() => {
		rootStore.setAccessTokenProvider(getAccessToken);
		rootStore.setPermissionReader(async () =>
			isAuth0Configured ? permissionsFromToken(await getAccessToken()) : everyPermission(),
		);
		void desk.start();

		return () => desk[Symbol.dispose]();
	}, [desk, getAccessToken, rootStore]);

	let content;

	switch (desk.phase) {
		case 'loading':
			content = <QueueDeskMessage text={t.queueDesk.loading} />;
			break;
		case 'not_permitted':
			content = <QueueDeskMessage text={t.queueDesk.notPermitted} />;
			break;
		case 'not_started':
			content = <QueueDeskMessage text={t.queueNotStarted} withDashboardLink />;
			break;
		case 'ended':
			content = <QueueDeskMessage text={t.queueDesk.ended} withDashboardLink />;
			break;
		case 'serving':
			content = <QueueLine />;
	}

	return (
		<QueueDeskProvider value={desk}>
			<QueueDeskFrame dir="ltr" lang="en">
				{content}
			</QueueDeskFrame>
			<ConfirmationDrawer />
			<NotificationToasts />
		</QueueDeskProvider>
	);
});

/** A screen with nothing to work on yet, and — where it helps — the way to the dashboard. */
export function QueueDeskMessage({
	text,
	withDashboardLink,
}: {
	text: string;
	withDashboardLink?: boolean;
}) {
	return (
		<Message aria-live="polite">
			<p>{text}</p>
			{withDashboardLink ? (
				<Button component={Link} to="/admin" variant="outlined">
					{adminTranslations.en.queueDesk.openDashboard}
				</Button>
			) : null}
		</Message>
	);
}
