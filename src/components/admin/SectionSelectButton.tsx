import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';

import { adminTranslations } from '../../adminLocales';
import type { QueueGuest } from '../../services/admin-api';
import { useRootStore } from '../../stores/react/store-context';

const Button = styled.button`
	min-height: 36px;
	padding: 0 12px;
	border: 0;
	border-radius: var(--radius-pill);
	color: var(--color-brand);
	background: var(--color-background);
	font: inherit;
	font-size: 14px;
	font-weight: 700;
	cursor: pointer;
`;

/**
 * A status section's heading action while picking out guests: every guest in it at once, the
 * usual case when a whole status was recorded wrong, or none of them once all are picked.
 */
export const SectionSelectButton = observer(function SectionSelectButton({
	guests,
	statusLabel,
}: {
	guests: readonly QueueGuest[];
	statusLabel: string;
}) {
	const t = adminTranslations.en.participants;
	const participants = useRootStore().admin.sessionParticipants;

	if (!participants.isSelecting) {
		return null;
	}

	const all = guests.every((guest) => participants.isChecked(guest));

	return (
		<Button
			type="button"
			aria-label={(all ? t.clearAllLabel : t.selectAllLabel).replace('{status}', statusLabel)}
			onClick={() => participants.toggleAll(guests)}
		>
			{all ? t.clearAll : t.selectAll}
		</Button>
	);
});
