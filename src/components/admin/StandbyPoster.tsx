import styled from '@emotion/styled';
import { Button } from '@mui/material';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

import { adminTranslations } from '../../adminLocales';
import { standbyUrl } from '../../services/standby';
import { useTranslation } from '../../stores/react/use-translation';
import type { StandbyPosterStore } from '../../stores/standby-poster.store';
import { QrPoster } from '../QrPoster';

const Message = styled.section`
	display: grid;
	gap: 16px;
	width: min(100% - 36px, 560px);
	margin: 0 auto;
	padding: 48px 0;

	p {
		margin: 0;
		color: var(--color-text-subtle);
		font-size: 17px;
		line-height: 1.6;
	}
`;

/**
 * Standby's printable poster: the current session's code, for guests at the market to scan with
 * their own phones. A session has one code, so the poster is printed each market day. Its words
 * are read by guests, so they are in the viewer's language, as on the `/qr-code` poster; the
 * controls around it are staff text.
 */
export const StandbyPoster = observer(function StandbyPoster({
	store,
}: {
	store: StandbyPosterStore;
}) {
	const t = adminTranslations.en;
	const copy = useTranslation().standby;
	const navigate = useNavigate();
	const back = () => void navigate('/admin/current-session');

	if (store.state === 'ready' && store.code) {
		return (
			<QrPoster
				url={standbyUrl(window.location.origin, store.code)}
				title={copy.title}
				description={copy.posterDescription}
				imageAlt={t.qrPosters.standby}
				backLabel={t.qrPosters.backToDashboard}
				onBack={back}
				printLabel={t.today.print}
			/>
		);
	}

	const message =
		store.state === 'loading'
			? t.qrPosters.loading
			: store.state === 'no_session'
				? t.qrPosters.noSession
				: t.qrPosters.failed;

	return (
		<Message>
			<p role={store.state === 'failed' ? 'alert' : 'status'}>{message}</p>
			<Button variant="outlined" onClick={back}>
				{t.qrPosters.backToDashboard}
			</Button>
		</Message>
	);
});

/** Builds the poster's store for the signed-in worker and reads the code once. */
export const StandbyPosterPage = observer(function StandbyPosterPage({
	createStore,
}: {
	createStore: () => StandbyPosterStore;
}) {
	const [store] = useState(createStore);

	useEffect(() => {
		void store.load();
	}, [store]);

	return <StandbyPoster store={store} />;
});
