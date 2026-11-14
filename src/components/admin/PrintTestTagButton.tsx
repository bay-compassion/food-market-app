import styled from '@emotion/styled';
import { Button } from '@mui/material';
import { observer } from 'mobx-react-lite';
import { useId } from 'react';

import { adminTranslations } from '../../adminLocales';
import { useRootStore } from '../../stores/react/store-context';

const TestPrint = styled.div`
	display: grid;
	gap: 4px;
	justify-items: start;

	p {
		margin: 0;
		color: var(--color-text-subtle);
		font-size: 13px;
	}
`;

/**
 * Sends a sample name tag to the print station, to check the label printer. Shown only to a worker
 * who can see whether the station is online, and disabled, saying why, while it isn't.
 */
export const PrintTestTagButton = observer(function PrintTestTagButton() {
	const t = adminTranslations.en.printStationCard;
	const { admin } = useRootStore();
	const online = admin.printStationOnline;
	const hintId = useId();

	if (online === null) {
		return null;
	}

	return (
		<TestPrint>
			<Button
				variant="outlined"
				aria-describedby={online ? undefined : hintId}
				disabled={!online || admin.isSendingTestTag}
				onClick={() => void admin.sendTestNameTag()}
			>
				{t.printTest}
			</Button>
			{online ? null : <p id={hintId}>{t.printTestOffline}</p>}
		</TestPrint>
	);
});
