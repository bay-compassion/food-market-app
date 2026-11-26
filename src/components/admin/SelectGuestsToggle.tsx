import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';

import { adminTranslations } from '../../adminLocales';
import { useRootStore } from '../../stores/react/store-context';

const Toggle = styled.button`
	flex: none;
	min-height: 40px;
	padding: 0 16px;
	border: 2px solid var(--color-brand);
	border-radius: var(--radius-pill);
	color: var(--color-brand);
	background: transparent;
	font: inherit;
	font-weight: 700;
	cursor: pointer;

	&[aria-pressed='true'] {
		color: var(--color-on-brand);
		background: var(--color-brand);
	}
`;

/** Starts picking out several of a session's guests to correct together, and ends it. */
export const SelectGuestsToggle = observer(function SelectGuestsToggle() {
	const t = adminTranslations.en.participants;
	const participants = useRootStore().admin.sessionParticipants;
	const selecting = participants.isSelecting;

	return (
		<Toggle
			type="button"
			aria-pressed={selecting}
			disabled={participants.isCorrecting}
			onClick={() => (selecting ? participants.stopSelecting() : participants.startSelecting())}
		>
			{selecting ? t.doneSelecting : t.select}
		</Toggle>
	);
});
