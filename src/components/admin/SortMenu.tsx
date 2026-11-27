import { ListItemIcon, MenuItem } from '@mui/material';

import { OverflowMenu } from './OverflowMenu';

function SortIcon() {
	return (
		<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" fill="none">
			<path
				d="M3 5h14M5 10h10M8 15h4"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
			/>
		</svg>
	);
}

function CheckIcon() {
	return (
		<svg width="18" height="18" viewBox="0 0 16 16" aria-hidden="true" fill="none">
			<path
				d="M3 8.5l3 3 7-7"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

export type SortMenuProps<Key extends string> = {
	/** Names the button, and should say which order is chosen now. */
	label: string;
	keys: readonly Key[];
	/** What each order is called in the menu. */
	labels: Record<Key, string>;
	value: Key;
	/** Fills the button in, for an order away from the list's usual one. */
	active: boolean;
	onChange: (key: Key) => void;
};

/** A sort button and the menu of orders it opens, with the chosen one checked. */
export function SortMenu<Key extends string>({
	label,
	keys,
	labels,
	value,
	active,
	onChange,
}: SortMenuProps<Key>) {
	return (
		<OverflowMenu label={label} icon={<SortIcon />} active={active}>
			{(closeMenu) =>
				keys.map((key) => (
					<MenuItem
						key={key}
						role="menuitemradio"
						aria-checked={value === key}
						selected={value === key}
						onClick={() => {
							onChange(key);
							closeMenu();
						}}
					>
						<ListItemIcon>{value === key ? <CheckIcon /> : null}</ListItemIcon>
						{labels[key]}
					</MenuItem>
				))
			}
		</OverflowMenu>
	);
}
