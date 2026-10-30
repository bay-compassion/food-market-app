import styled from '@emotion/styled';
import Button from '@mui/material/Button';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';

import { useTranslation } from '../stores/react/use-translation';
import { Dialog } from './ui/Dialog';
import { PlayCircleIcon } from './ui/icons/PlayCircleIcon';

// The standalone player has no portfolio navigation or links to staff presentations.
const guestGuideUrl =
	'https://bay-compassion.github.io/food-market-app/presentations/guest-guide/guest-guide.html';

// The dialog content's padding would cost the player over a tenth of a phone's width, so the
// player bleeds past it to fill everything below the dialog's header.
const Player = styled.iframe`
	display: block;
	flex: 1;
	width: calc(100% + 44px);
	min-height: 0;
	margin: -22px;
	border: 0;
`;

const Content = styled.div`
	display: flex;
	flex-direction: column;
	height: 100%;
`;

/**
 * Both guest entry points play the same hosted guide, without leaving the app. A `compact` button
 * takes the short label, to sit with another button.
 */
export const GuestGuideButton = observer(function GuestGuideButton({
	compact = false,
}: {
	compact?: boolean;
}) {
	const {
		guestView: { presentation: copy },
	} = useTranslation();
	const [open, setOpen] = useState(false);

	return (
		<>
			<Button
				variant="outlined"
				size="large"
				startIcon={<PlayCircleIcon />}
				onClick={() => setOpen(true)}
			>
				{compact ? copy.watchShort : copy.watch}
			</Button>
			{open ? (
				<Dialog
					open
					title={copy.title}
					closeLabel={copy.close}
					onClose={() => setOpen(false)}
					fullScreen
				>
					<Content>
						<Player
							src={guestGuideUrl}
							title={copy.title}
							sandbox="allow-scripts allow-same-origin"
							allow="fullscreen"
							allowFullScreen
							referrerPolicy="no-referrer"
						/>
					</Content>
				</Dialog>
			) : null}
		</>
	);
});
