import {
	MenuItem,
	Paper,
	Stack,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TablePagination,
	TableRow,
	Typography,
} from '@mui/material';
import { observer } from 'mobx-react-lite';

import { useRootStore } from '../../stores/react/store-context';
import { OverflowMenu } from './OverflowMenu';

/** Auth0 pages are already loaded by the store; MUI owns table semantics and pagination controls. */
export const WorkersTable = observer(function WorkersTable() {
	const { workers: store } = useRootStore();

	return (
		<Paper variant="outlined" sx={{ minWidth: 0 }}>
			<TableContainer>
				<Table aria-label="Staff Accounts" size="small" sx={{ tableLayout: 'fixed' }}>
					<TableHead>
						<TableRow>
							<TableCell>Account</TableCell>
							<TableCell sx={{ width: '35%' }}>Access</TableCell>
							<TableCell align="right" sx={{ width: 80 }}>
								Actions
							</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{store.workers.map((worker) => (
							<TableRow key={worker.id} aria-label={worker.email || worker.name}>
								<TableCell component="th" scope="row" sx={{ overflowWrap: 'anywhere' }}>
									<Typography variant="body2" sx={{ fontWeight: 700 }}>
										{worker.name}
										{worker.self ? ' (You)' : ''}
									</Typography>
									<Typography variant="body2">{worker.email}</Typography>
								</TableCell>
								<TableCell sx={{ overflowWrap: 'anywhere' }}>
									<Stack spacing={0.5}>
										<Typography variant="body2">
											{worker.roles.join(', ') || 'No Staff Role'}
										</Typography>
										<Typography variant="body2" color="text.secondary">
											{worker.blocked ? 'Access Removed' : 'Active'}
										</Typography>
										{!worker.editable ? (
											<Typography variant="caption" color="text.secondary">
												{worker.self ? 'Your access cannot be changed here.' : 'Managed in Auth0'}
											</Typography>
										) : null}
									</Stack>
								</TableCell>
								<TableCell align="right">
									{worker.editable ? (
										<OverflowMenu
											label={`Actions for ${worker.email || worker.name}`}
											disabled={store.busy}
										>
											{(closeMenu) => (
												<>
													<MenuItem
														disabled={
															!worker.blocked &&
															worker.roles.length === 1 &&
															worker.roles[0] === 'worker'
														}
														onClick={() => {
															closeMenu();
															void store.change(worker, 'worker');
														}}
													>
														{worker.blocked ? 'Restore as Worker' : 'Make Worker'}
													</MenuItem>
													<MenuItem
														disabled={
															!worker.blocked &&
															worker.roles.length === 1 &&
															worker.roles[0] === 'admin'
														}
														onClick={() => {
															closeMenu();
															void store.change(worker, 'admin');
														}}
													>
														{worker.blocked ? 'Restore as Admin' : 'Make Admin'}
													</MenuItem>
													<MenuItem
														disabled={worker.blocked}
														sx={{ color: 'error.main' }}
														onClick={() => {
															closeMenu();
															void store.change(worker, 'remove');
														}}
													>
														Remove Access
													</MenuItem>
												</>
											)}
										</OverflowMenu>
									) : null}
								</TableCell>
							</TableRow>
						))}
						{store.workers.length === 0 ? (
							<TableRow>
								<TableCell colSpan={3}>
									{store.busy
										? 'Loading staff accounts…'
										: store.error
											? 'Staff accounts could not be loaded.'
											: 'No accounts on this page.'}
								</TableCell>
							</TableRow>
						) : null}
					</TableBody>
				</Table>
			</TableContainer>
			<TablePagination
				component="div"
				count={-1}
				labelDisplayedRows={() => `Page ${store.page + 1}`}
				slotProps={{ actions: { nextButton: { disabled: store.busy || !store.hasMore } } }}
				page={store.page}
				rowsPerPage={10}
				rowsPerPageOptions={[10]}
				disabled={store.busy}
				onPageChange={(_, page) => void store.load(page)}
			/>
		</Paper>
	);
});
