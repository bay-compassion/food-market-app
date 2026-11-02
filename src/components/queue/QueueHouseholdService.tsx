import styled from '@emotion/styled';
import { IconButton } from '@mui/material';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';

import { adminTranslations } from '../../adminLocales';
import { useRootStore } from '../../stores/react/store-context';
import { HouseholdServiceForm } from '../admin/HouseholdServiceRecorder';
import { QueueSection } from './TicketSection';

const Summary = styled.div`
	display: flex;
	align-items: center;
	gap: 4px;
	color: var(--color-text-subtle);
	font-size: 14px;
`;

/** End-of-service recording stays with the completed tickets, without a separate dialog. */
export const QueueHouseholdService = observer(function QueueHouseholdService({
	marketEventId,
}: {
	marketEventId: string;
}) {
	const { admin } = useRootStore();
	const [store] = useState(() => admin.createHouseholdServiceStore(marketEventId));
	const t = adminTranslations.en.householdService;

	return (
		<QueueSection aria-label={t.sectionTitle}>
			<header>
				<h2>
					{t.sectionTitle}
					<span className="count">{store.loaded ? store.households : '—'}</span>
				</h2>
				<Summary>
					{store.loaded ? (
						<span>
							{store.members} {t.people}
						</span>
					) : null}
					<IconButton
						aria-label={t.refresh}
						disabled={store.busy}
						onClick={() => void store.load()}
						size="small"
					>
						<svg
							width="18"
							height="18"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="1.75"
							aria-hidden="true"
						>
							<path d="M20 7v5h-5M4 17v-5h5" />
							<path d="M6 7a7 7 0 0 1 12-1l2 3M4 15l2 3a7 7 0 0 0 12-1" />
						</svg>
					</IconButton>
				</Summary>
			</header>
			<HouseholdServiceForm store={store} inline />
		</QueueSection>
	);
});
