import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';

import { adminTranslations } from '../../adminLocales';
import { useRootStore } from '../../stores/react/store-context';

const Status = styled.span`
	flex: none;
	padding: 3px 10px;
	border-radius: var(--radius-pill);
	font-size: 13px;
	font-weight: 700;
	white-space: nowrap;

	&[data-online='true'] {
		color: var(--color-success);
		background: var(--color-success-surface);
	}

	&[data-online='false'] {
		color: var(--color-error);
		background: var(--color-surface-soft);
	}
`;

/** Online or Offline for the print station, or nothing while that is unknown. */
export const PrintStationStatus = observer(function PrintStationStatus() {
	const t = adminTranslations.en.printStationCard;
	const online = useRootStore().admin.printStationOnline;

	return online === null ? null : (
		<Status data-online={online} role="status">
			{online ? t.online : t.offline}
		</Status>
	);
});
