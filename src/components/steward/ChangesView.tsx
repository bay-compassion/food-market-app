import { observer } from 'mobx-react-lite';

import { shortDate } from './format';
import { useSteward } from './steward-context';
import {
	Card,
	Eyebrow,
	Lede,
	Page,
	PageTitle,
	Stat,
	StatGrid,
	Table,
	TableFrame,
} from './steward.styles';

const scopeLabels = { next: 'This Saturday only', weeks: 'Standing', open: 'Until changed' };

export const ChangesView = observer(function ChangesView(): React.JSX.Element {
	const steward = useSteward();
	const roster = steward.roster!;
	const summary = roster.changeSummary(new Date());
	const { changes } = roster.ledger;

	return (
		<Page>
			<header>
				<Eyebrow>Last 30 days</Eyebrow>
				<PageTitle>
					{summary.recent} {summary.recent === 1 ? 'Change' : 'Changes'} by {summary.byActor.length}{' '}
					{summary.byActor.length === 1 ? 'Steward' : 'Stewards'}
				</PageTitle>
				<Lede>Every change stays on this list. It can't be edited or removed.</Lede>
			</header>
			<StatGrid>
				<Stat>
					<strong>{summary.raised}</strong>
					<span>Guests Raised Right Now</span>
				</Stat>
				<Stat>
					<strong>{summary.endingSoon}</strong>
					<span>Ending in the Next 2 Weeks</span>
				</Stat>
				<Stat>
					<strong>{summary.openEnded}</strong>
					<span>Set Until Changed, With No End</span>
				</Stat>
				{summary.byActor.map(([name, count]) => (
					<Stat key={name}>
						<strong>{count}</strong>
						<span>By {name}</span>
					</Stat>
				))}
			</StatGrid>
			<Card>
				{changes.length === 0 ? (
					<Lede>Nobody has changed anyone's odds yet.</Lede>
				) : (
					<TableFrame>
						<Table style={{ minWidth: 720 }}>
							<thead>
								<tr>
									<th scope="col">Date</th>
									<th scope="col">Guest</th>
									<th scope="col">Change</th>
									<th scope="col">How Long</th>
									<th scope="col">Reason</th>
									<th scope="col">Steward</th>
								</tr>
							</thead>
							<tbody>
								{changes.map((change) => (
									<tr key={change.id}>
										<td>{shortDate(change.createdAt)}</td>
										<th scope="row">{change.guestName}</th>
										<td>
											<strong>
												×{change.previousWeight} to ×{change.weight}
											</strong>
										</td>
										<td>
											{change.endsAt
												? `Until ${shortDate(change.endsAt)}`
												: scopeLabels[change.scope]}
										</td>
										<td>
											{change.reason}
											{change.note ? ` · ${change.note}` : ''}
										</td>
										<td>{change.actorName ?? 'Unnamed'}</td>
									</tr>
								))}
							</tbody>
						</Table>
					</TableFrame>
				)}
			</Card>
		</Page>
	);
});
