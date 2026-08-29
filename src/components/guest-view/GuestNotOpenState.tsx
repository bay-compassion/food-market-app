import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';
import { useNavigate } from 'react-router';

import { useTranslation } from '../../stores/react/use-translation';
import { AppButton } from '../AppButton';
import { GuestStateMessage } from './GuestStateMessage';

export type GuestNotOpenStateProps = {
	/**
	 * Whether to offer the way through to pre-registration. False on `/signup` itself, where the
	 * button would only lead back to the page the guest is already on, and once a session has
	 * ended, when there is nothing scheduled left to pre-register for.
	 */
	allowPreregister?: boolean;
};

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

/** The market is closed: when it next opens, how the lottery works, and how to hear about it. */
export const GuestNotOpenState = observer(function GuestNotOpenState({
	allowPreregister = true,
}: GuestNotOpenStateProps) {
	const t = useTranslation();
	const navigate = useNavigate();
	const copy = t.guestView.notOpenState;

	return (
		<Message className="inactive-message" heading={copy.heading} description={copy.subheading}>
			{allowPreregister ? (
				<AppButton label={copy.preregisterAction} onClick={() => void navigate('/signup')} />
			) : null}
			<Details className="inactive-details">
				<p>{copy.lotteryDescription}</p>
				<p>{copy.selectionDescription}</p>
			</Details>
		</Message>
	);
});
