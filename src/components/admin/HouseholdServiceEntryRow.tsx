import { Button, MenuItem } from '@mui/material';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';

import { adminTranslations } from '../../adminLocales';
import type { HouseholdServiceEntry } from '../../services/household-service';
import type { HouseholdServiceStore } from '../../stores/household-service.store';
import { NumberSpinner } from '../NumberSpinner';
import { OverflowMenu } from './OverflowMenu';

export const HouseholdServiceEntryRow = observer(function HouseholdServiceEntryRow({
	entry,
	store,
	inline = false,
}: {
	entry: HouseholdServiceEntry;
	store: HouseholdServiceStore;
	inline?: boolean;
}) {
	const t = adminTranslations.en.householdService;
	const [editing, setEditing] = useState(false);
	const [size, setSize] = useState<number | string>(entry.householdSize);
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
					<NumberSpinner
						label={t.size}
						value={size}
						onChange={setSize}
						disabled={disabled}
						min={1}
						max={30}
						required
						decrementLabel={adminTranslations.en.decreaseNumber}
						incrementLabel={adminTranslations.en.increaseNumber}
					/>
					<Button type="submit" disabled={disabled}>
						{t.saveCorrection}
					</Button>
					<Button disabled={disabled} onClick={() => setEditing(false)}>
						{t.cancel}
					</Button>
				</form>
			) : !inline ? (
				<Button
					disabled={disabled || !!entry.voidedAt}
					onClick={() => {
						setSize(String(entry.householdSize));
						setEditing(true);
					}}
				>
					{t.correct}
				</Button>
			) : null}
			{inline ? (
				<OverflowMenu
					label={`${t.entryActions}: ${entry.householdSize} ${t.people}`}
					disabled={disabled}
				>
					{(closeMenu) => (
						<>
							{!entry.voidedAt ? (
								<MenuItem
									onClick={() => {
										closeMenu();
										setSize(String(entry.householdSize));
										setEditing(true);
									}}
								>
									{t.correct}
								</MenuItem>
							) : null}
							<MenuItem
								onClick={() => {
									closeMenu();
									void store.correct(entry, entry.householdSize, !entry.voidedAt);
								}}
							>
								{entry.voidedAt ? t.restore : t.undo}
							</MenuItem>
						</>
					)}
				</OverflowMenu>
			) : (
				<Button
					disabled={disabled}
					onClick={() => void store.correct(entry, entry.householdSize, !entry.voidedAt)}
				>
					{entry.voidedAt ? t.restore : t.undo}
				</Button>
			)}
		</li>
	);
});
