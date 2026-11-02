import { observer } from 'mobx-react-lite';
import { useState } from 'react';

import { tierEntries } from '../../models/steward-roster';
import { LastDrawPanel } from './LastDrawPanel';
import { NextDrawPanel } from './NextDrawPanel';
import { useSteward } from './steward-context';
import { Chip, Lede, Page } from './steward.styles';

/** The next draw once anyone has entered it, otherwise the last one. */
export const DrawView = observer(function DrawView(): React.JSX.Element {
	const roster = useSteward().roster!;
	const { upcoming } = roster.ledger;
	const hasNext = upcoming !== null && tierEntries(upcoming.tiers) > 0;
	const [chosen, setChosen] = useState<'next' | 'last' | null>(null);
	const showing = chosen ?? (hasNext ? 'next' : 'last');

	return (
		<Page>
			<div role="group" aria-label="Which draw" style={{ display: 'flex', gap: 6 }}>
				<Chip selected={showing === 'next'} onClick={() => setChosen('next')}>
					Next Draw
				</Chip>
				<Chip selected={showing === 'last'} onClick={() => setChosen('last')}>
					Last Draw
				</Chip>
			</div>
			{showing === 'next' ? (
				hasNext ? (
					<NextDrawPanel />
				) : (
					<Lede>Nobody has entered the next draw yet.</Lede>
				)
			) : roster.lastDraw ? (
				<LastDrawPanel draw={roster.lastDraw} />
			) : (
				<Lede>No draw has run yet.</Lede>
			)}
		</Page>
	);
});
