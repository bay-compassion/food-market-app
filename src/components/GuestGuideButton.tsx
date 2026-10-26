import styled from '@emotion/styled';
import Button from '@mui/material/Button';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';

import { useTranslation } from '../stores/react/use-translation';
import { Dialog } from './ui/Dialog';

// The standalone player has no portfolio navigation or links to staff presentations.
const guestGuideUrl =
	'https://bay-compassion.github.io/food-market-app/presentations/guest-guide/guest-guide.html';

const Player = styled.iframe`
	display: block;
	width: 100%;
	height: min(65svh, 640px);
	border: 0;
	border-radius: var(--radius-sm);
`;

/** Both guest entry points play the same hosted guide, without leaving the app. */
export const GuestGuideButton = observer(function GuestGuideButton() {
	const {
		guestView: { presentation: copy },
	} = useTranslation();
	const [open, setOpen] = useState(false);

	return (
		<>
			<Button variant="outlined" size="large" onClick={() => setOpen(true)}>
				{copy.watch}
			</Button>
			{open ? (
				<Dialog open title={copy.title} closeLabel={copy.close} onClose={() => setOpen(false)}>
					<p>{copy.sound}</p>
					<Player
						src={guestGuideUrl}
						title={copy.title}
						sandbox="allow-scripts allow-same-origin"
						allow="fullscreen"
						allowFullScreen
						referrerPolicy="no-referrer"
					/>
				</Dialog>
			) : null}
		</>
	);
});
