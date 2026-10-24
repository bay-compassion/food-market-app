import {
	Alert,
	Button,
	FormControl,
	FormLabel,
	MenuItem,
	Paper,
	Select,
	Stack,
	TextField,
} from '@mui/material';
import { observer } from 'mobx-react-lite';
import { useEffect, useId, useState } from 'react';

import type { WorkerRole } from '../../services/workers';
import { useRootStore } from '../../stores/react/store-context';
import { WorkersTable } from './WorkersTable';

export const WorkersView = observer(function WorkersView() {
	const { workers: store } = useRootStore();
	const [name, setName] = useState('');
	const [email, setEmail] = useState('');
	const [role, setRole] = useState<WorkerRole>('worker');
	const roleId = useId();
	const roleLabelId = `${roleId}-label`;

	useEffect(() => {
		void store.load(0);
	}, [store]);

	return (
		<Stack
			component="section"
			className="admin-section"
			spacing={2.5}
			aria-label="Workers"
			aria-busy={store.busy}
		>
			<p>
				Manage staff access. Owners and special roles are managed in Auth0. You cannot change your
				own access.
			</p>
			<Paper variant="outlined" sx={{ p: 2 }}>
				<Stack
					component="form"
					spacing={1.5}
					onSubmit={(event) => {
						event.preventDefault();
						void store.add(name, email, role).then((added) => {
							if (added) {
								setName('');
								setEmail('');
								setRole('worker');
							}
						});
					}}
				>
					<h2>Add a Worker</h2>
					<TextField
						label="Name"
						required
						value={name}
						onChange={(event) => setName(event.target.value)}
						slotProps={{ htmlInput: { maxLength: 80 } }}
						disabled={store.busy}
					/>
					<TextField
						label="Email"
						type="email"
						required
						value={email}
						onChange={(event) => setEmail(event.target.value)}
						disabled={store.busy}
					/>
					<FormControl fullWidth disabled={store.busy}>
						<FormLabel id={roleLabelId} htmlFor={roleId}>
							Role
						</FormLabel>
						<Select<WorkerRole>
							id={roleId}
							labelId={roleLabelId}
							native={false}
							value={role}
							onChange={(event) => setRole(event.target.value as WorkerRole)}
							sx={{
								'& .MuiSelect-select': {
									display: 'flex',
									alignItems: 'center',
									minHeight: 58,
									boxSizing: 'border-box',
								},
							}}
						>
							<MenuItem value="worker">Worker</MenuItem>
							<MenuItem value="admin">Admin</MenuItem>
						</Select>
					</FormControl>
					<p>Workers run the queue. Admins also manage the market, guest data, and staff access.</p>
					<p>
						After adding an account, ask the worker to use Forgot Password on the sign-in page. No
						password is shared with admins.
					</p>
					<Button type="submit" variant="contained" disabled={store.busy}>
						Add Worker
					</Button>
				</Stack>
			</Paper>
			<Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
				<h2>Staff Accounts</h2>
				<Button disabled={store.busy} onClick={() => void store.load()}>
					Refresh
				</Button>
			</Stack>
			{store.error ? <Alert severity="error">{store.error}</Alert> : null}
			<WorkersTable />
		</Stack>
	);
});
