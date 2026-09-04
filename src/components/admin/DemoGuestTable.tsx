import {
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TablePagination,
	TableRow,
	TableSortLabel,
} from '@mui/material';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';

import {
	DemoGuestTableRows,
	type DemoGuestColumn,
	type SortDirection,
} from '../../services/demo-guest-table';
import type { DemoRoster } from '../../services/demo-preview';
import { DemoPreviewSession } from '../../stores/demo-preview-session';
import { useRootStore } from '../../stores/react/store-context';
import { UnderlineButton } from '../UnderlineButton';

const columns: { key: DemoGuestColumn; label: string; numeric?: boolean }[] = [
	{ key: 'ordinal', label: '#', numeric: true },
	{ key: 'name', label: 'Guest preview' },
	{ key: 'language', label: 'Language' },
	{ key: 'status', label: 'Status' },
	{ key: 'queue', label: 'Queue', numeric: true },
];

/** The parent keys this table by scenario so a new roster starts on its first page. */
export const DemoGuestTable = observer(function DemoGuestTable({ roster }: { roster: DemoRoster }) {
	const { admin } = useRootStore();
	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(5);
	const [sort, setSort] = useState<{ column: DemoGuestColumn; direction: SortDirection }>({
		column: 'ordinal',
		direction: 'asc',
	});
	const rows = new DemoGuestTableRows(roster, admin.sessionGuests).sorted(
		sort.column,
		sort.direction,
	);

	function sortBy(column: DemoGuestColumn) {
		setSort({
			column,
			direction: sort.column === column && sort.direction === 'asc' ? 'desc' : 'asc',
		});
		setPage(0);
	}

	return (
		<>
			<TableContainer>
				<Table
					size="small"
					aria-label="Demo guests"
					sx={{ '& .MuiTableCell-root': { padding: '8px' } }}
				>
					<TableHead>
						<TableRow>
							{columns.map(({ key, label, numeric }) => (
								<TableCell
									key={key}
									align={numeric ? 'right' : 'left'}
									sortDirection={sort.column === key ? sort.direction : false}
								>
									<TableSortLabel
										active={sort.column === key}
										direction={sort.column === key ? sort.direction : 'asc'}
										onClick={() => sortBy(key)}
										aria-label={`Sort by ${key === 'ordinal' ? 'number' : label.toLowerCase()}`}
									>
										{label}
									</TableSortLabel>
								</TableCell>
							))}
						</TableRow>
					</TableHead>
					<TableBody>
						{rows.slice(page * rowsPerPage, (page + 1) * rowsPerPage).map((row) => {
							const { guest } = row;

							return (
								<TableRow key={guest.id}>
									<TableCell align="right">{row.ordinal}</TableCell>
									<TableCell component="th" scope="row">
										<UnderlineButton
											aria-label={`View as guest: ${guest.firstName} ${guest.lastName}`}
											onClick={() => admin.demo.recordOpenResult(DemoPreviewSession.open(guest))}
										>
											{guest.firstName} {guest.lastName}
										</UnderlineButton>
									</TableCell>
									<TableCell>{row.language}</TableCell>
									<TableCell>{row.status}</TableCell>
									<TableCell align="right">{row.queue ?? '—'}</TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
			</TableContainer>
			<TablePagination
				component="div"
				count={roster.guests.length}
				page={page}
				rowsPerPage={rowsPerPage}
				rowsPerPageOptions={[5, 10, 25]}
				onPageChange={(_, nextPage) => setPage(nextPage)}
				onRowsPerPageChange={(event) => {
					setRowsPerPage(Number(event.target.value));
					setPage(0);
				}}
				sx={{
					'& .MuiTablePagination-toolbar': { flexWrap: 'wrap', padding: 0 },
					'& .MuiTablePagination-spacer': { display: 'none' },
				}}
			/>
		</>
	);
});
