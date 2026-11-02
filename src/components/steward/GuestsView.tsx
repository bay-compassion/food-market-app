import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';

import { GuestDetail } from './GuestDetail';
import { GuestTable } from './GuestTable';
import { useSteward } from './steward-context';
import { Page, PageTitle } from './steward.styles';

const Workspace = styled.div`
	display: grid;
	gap: 16px;
	align-items: start;

	@media (min-width: 1024px) {
		grid-template-columns: minmax(0, 1fr) 360px;
	}
`;

/* A phone has room for one at a time: the list, or the guest picked from it. */
const Pane = styled.div<{ hideOnPhone: boolean }>`
	min-width: 0;

	@media (max-width: 1023px) {
		display: ${({ hideOnPhone }) => (hideOnPhone ? 'none' : 'block')};
	}
`;

export const GuestsView = observer(function GuestsView(): React.JSX.Element {
	const { selected } = useSteward();

	return (
		<Page>
			<PageTitle>Guests</PageTitle>
			<Workspace>
				<Pane hideOnPhone={selected !== null}>
					<GuestTable />
				</Pane>
				<Pane hideOnPhone={selected === null}>
					<GuestDetail />
				</Pane>
			</Workspace>
		</Page>
	);
});
