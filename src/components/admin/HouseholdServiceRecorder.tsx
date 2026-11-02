import styled from '@emotion/styled';
import { Alert, Button, TextField } from '@mui/material';
import { observer } from 'mobx-react-lite';
import { useEffect, useRef, useState, type FormEvent } from 'react';

import { adminTranslations } from '../../adminLocales';
import { AdminApi } from '../../services/admin-api';
import type { HouseholdServiceEntry } from '../../services/household-service';
import {
	HouseholdServiceStore,
	type HouseholdServiceApi,
} from '../../stores/household-service.store';
import { useRootStore } from '../../stores/react/store-context';
import { Dialog } from '../ui/Dialog';

const Content = styled.div`
	display: grid;
	gap: 16px;
	form,
	.entry {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 12px;
	}
	ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 16px;
	}
	p {
		margin: 0;
	}
`;

const Entry = observer(function Entry({
	entry,
	store,
}: {
	entry: HouseholdServiceEntry;
	store: HouseholdServiceStore;
}) {
	const t = adminTranslations.en.householdService;
	const [editing, setEditing] = useState(false);
	const [size, setSize] = useState(String(entry.householdSize));
	const disabled = store.busy || !!store.pending;

	return (
		<li className="entry">
			<span>
				{entry.householdSize} {t.people} ·{' '}
				{new Date(entry.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
				{entry.voidedAt ? ` · ${t.voided}` : ''}
			</span>
			{editing ? (
				<form
					onSubmit={async (event) => {
						event.preventDefault();

						if (await store.correct(entry, Number(size), !!entry.voidedAt)) {
							setEditing(false);
						}
					}}
				>
					<TextField
						label={t.size}
						type="number"
						value={size}
						onChange={(event) => setSize(event.target.value)}
						disabled={disabled}
						slotProps={{ htmlInput: { min: 1, max: 30, step: 1, required: true } }}
					/>
					<Button type="submit" disabled={disabled}>
						{t.saveCorrection}
					</Button>
					<Button disabled={disabled} onClick={() => setEditing(false)}>
						{t.cancel}
					</Button>
				</form>
			) : (
				<Button
					disabled={disabled || !!entry.voidedAt}
					onClick={() => {
						setSize(String(entry.householdSize));
						setEditing(true);
					}}
				>
					{t.correct}
				</Button>
			)}
			<Button
				disabled={disabled}
				onClick={() => void store.correct(entry, entry.householdSize, !entry.voidedAt)}
			>
				{entry.voidedAt ? t.restore : t.undo}
			</Button>
		</li>
	);
});

export const HouseholdServiceForm = observer(function HouseholdServiceForm({
	store,
}: {
	store: HouseholdServiceStore;
}) {
	const t = adminTranslations.en.householdService;
	const [size, setSize] = useState('');
	const [saved, setSaved] = useState(false);
	const input = useRef<HTMLInputElement>(null);

	useEffect(() => {
		void store.load();
	}, [store]);

	useEffect(() => {
		if (store.loaded && !store.pending) {
			input.current?.focus();
		}
	}, [store.loaded, store.pending]);

	async function submit(event: FormEvent) {
		event.preventDefault();
		setSaved(false);

		if (await store.record(Number(size))) {
			setSize('');
			setSaved(true);
			input.current?.focus();
		}
	}

	return (
		<Content>
			<p>{t.help}</p>
			{store.error ? <Alert severity="error">{t.errors[store.error]}</Alert> : null}
			{saved ? (
				<Alert severity="success" role="status">
					{t.saved}
				</Alert>
			) : null}
			<form onSubmit={(event) => void submit(event)}>
				<TextField
					inputRef={input}
					autoFocus
					label={t.size}
					type="number"
					value={store.pending?.householdSize ?? size}
					onChange={(event) => {
						setSize(event.target.value);
						setSaved(false);
					}}
					disabled={store.busy || !!store.pending || !store.loaded}
					slotProps={{
						htmlInput: { min: 1, max: 30, step: 1, required: true, inputMode: 'numeric' },
					}}
				/>
				<Button type="submit" variant="contained" disabled={store.busy || !store.loaded}>
					{store.pending ? t.retrySave : t.record}
				</Button>
			</form>
			<Button onClick={() => void store.load()} disabled={store.busy}>
				{t.refresh}
			</Button>
			{store.loaded ? (
				<p>
					{t.total}: <strong>{store.households}</strong> {t.households},{' '}
					<strong>{store.members}</strong> {t.people}
				</p>
			) : null}
			<ul aria-label={t.entries}>
				{store.entries.map((entry) => (
					<Entry key={`${entry.id}-${entry.version}`} entry={entry} store={store} />
				))}
			</ul>
		</Content>
	);
});

/** Keep the recorder mounted while closed so an uncertain network save retains its retry id. */
export const HouseholdServiceRecorder = observer(function HouseholdServiceRecorder({
	marketEventId,
	api,
	initiallyOpen = false,
	onClosed,
}: {
	marketEventId: string;
	api?: HouseholdServiceApi;
	initiallyOpen?: boolean;
	onClosed?: () => void;
}) {
	const root = useRootStore();
	const t = adminTranslations.en.householdService;
	const [open, setOpen] = useState(initiallyOpen);
	const [store] = useState(
		() =>
			new HouseholdServiceStore(
				marketEventId,
				api ?? new AdminApi({ requestHeaders: () => root.requestHeaders() }),
			),
	);

	return (
		<>
			{!initiallyOpen ? (
				<Button variant="outlined" onClick={() => setOpen(true)}>
					{t.title}
				</Button>
			) : null}
			<Dialog
				open={open}
				title={t.title}
				closeLabel={t.close}
				onClose={() => {
					if (!store.busy) {
						setOpen(false);
						onClosed?.();
					}
				}}
			>
				{open ? <HouseholdServiceForm store={store} /> : null}
			</Dialog>
		</>
	);
});
