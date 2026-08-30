import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';

import { useTranslation } from '../../stores/react/use-translation';
import { GuestStateMessage } from './GuestStateMessage';

const Message = styled(GuestStateMessage)`
	--state-description-max-width: 420px;
`;

const Details = styled.div`
	display: grid;
	max-width: 420px;
	gap: 16px;
	margin-top: 20px;
	color: var(--color-text-muted);
	line-height: 1.55;
	text-align: justify;
	text-align-last: start;
	hyphens: auto;
`;

const Divider = styled.hr`
	width: 100%;
	max-width: 420px;
	margin: 24px 0 0;
	border: 0;
	border-top: 1px solid var(--color-border);
`;

/** The market is closed: when it next opens, how the lottery works, and how to hear about it. */
export const GuestNotOpenState = observer(function GuestNotOpenState() {
	const t = useTranslation();
	const copy = t.guestView.notOpenState;

	return (
		<Message className="inactive-message" heading={copy.heading} description={copy.subheading}>
			<Divider />
			<Details className="inactive-details">
				<p>{copy.lotteryDescription}</p>
				<p>{copy.selectionDescription}</p>
			</Details>
		</Message>
	);
});
