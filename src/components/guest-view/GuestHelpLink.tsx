import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';
import { Link } from 'react-router';

import { useTranslation } from '../../stores/react/use-translation';
import { HelpIcon } from '../ui/icons/HelpIcon';

const Row = styled.p`
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	column-gap: 6px;
	margin: 0 0 8px;
	color: inherit;
	font-size: 15px;
	line-height: 1.4;

	svg {
		flex-shrink: 0;
		font-size: 20px;
	}

	a {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		color: inherit;
		font-weight: 700;
		text-underline-offset: 3px;
	}
`;

/**
 * The way out for a guest the home screen leaves unsure: a plain line pointing at the help page.
 * Takes its color from its surroundings, so a card can mute it.
 */
export const GuestHelpLink = observer(function GuestHelpLink({
	className,
}: {
	className?: string;
}) {
	const t = useTranslation();

	return (
		<Row className={className}>
			<HelpIcon aria-hidden="true" />
			<span>{t.guestView.helpPrompt}</span>
			<Link to="/help">{t.help.title}</Link>
		</Row>
	);
});
