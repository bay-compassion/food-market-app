import { IconButton, InputAdornment, TextField } from '@mui/material';
import { observer } from 'mobx-react-lite';
import { useEffect, useRef } from 'react';

import { adminTranslations } from '../../adminLocales';
import { SearchIcon } from './SearchIcon';
import { useTicketList } from './ticket-list-context';

function ClearIcon() {
	return (
		<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="none">
			<path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
		</svg>
	);
}

/**
 * The search dialog's field: a name, a queue number, a phone number, or a name tag's reference
 * code — for the guest at the desk asking where they are, or a sticker to check. Enter acts on the
 * ticket when there is only one match.
 */
export const TicketSearchField = observer(function TicketSearchField() {
	const t = adminTranslations.en.queueDesk;
	const desk = useTicketList();
	const { query } = desk.search;
	const input = useRef<HTMLInputElement>(null);

	// `autoFocus` alone is not enough. It focuses the field as it mounts, inside the tap that opened
	// the search, which is what raises a phone's keyboard. But under StrictMode, as the app runs,
	// the dialog's focus trap is torn down and set up again straight after: the teardown hands focus
	// back to the button that opened it, and the setup then focuses the dialog itself. Focusing again
	// here, in an effect, runs after that teardown and before the trap's setup — a child's effects
	// run before its parent's — so the trap finds focus already inside and leaves it there.
	useEffect(() => {
		input.current?.focus();
	}, []);

	return (
		<TextField
			className="queue-search"
			type="search"
			size="small"
			fullWidth
			placeholder={t.searchPlaceholder}
			value={query}
			onChange={(event) => desk.setSearchQuery(event.target.value)}
			onKeyDown={(event) => {
				if (event.key === 'Enter') {
					// Opening the ticket closes the search and hands focus back to whatever opened it;
					// left to run, the same key press would then press that and open the search again.
					event.preventDefault();
					desk.selectSoleSearchResult();
				}
			}}
			inputRef={input}
			autoFocus
			autoComplete="off"
			// The clear button below stands in for WebKit's own, which would make two.
			sx={{
				'& input::-webkit-search-cancel-button': { appearance: 'none' },
				'& .MuiOutlinedInput-root': { background: 'var(--color-background)' },
			}}
			slotProps={{
				htmlInput: { 'aria-label': t.search, enterKeyHint: 'search' },
				input: {
					startAdornment: (
						<InputAdornment position="start">
							<SearchIcon size={18} />
						</InputAdornment>
					),
					endAdornment: query ? (
						<InputAdornment position="end">
							<IconButton
								size="small"
								edge="end"
								aria-label={t.clearSearch}
								onClick={() => desk.setSearchQuery('')}
							>
								<ClearIcon />
							</IconButton>
						</InputAdornment>
					) : null,
				},
			}}
		/>
	);
});
