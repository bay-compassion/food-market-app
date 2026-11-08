import { IconButton, InputAdornment, TextField } from '@mui/material';
import { observer } from 'mobx-react-lite';

import { adminTranslations } from '../../adminLocales';
import { useQueueDesk } from './queue-desk-context';

function SearchIcon() {
	return (
		<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none">
			<circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="2" />
			<path d="M16 16l4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
		</svg>
	);
}

function ClearIcon() {
	return (
		<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="none">
			<path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
		</svg>
	);
}

/**
 * The search dialog's field: a name, a queue number, a phone number, or a name tag's reference
 * code — for the guest at the desk asking where they are, or a sticker to check. Enter opens the
 * ticket when there is only one match.
 */
export const QueueSearchField = observer(function QueueSearchField() {
	const t = adminTranslations.en.queueDesk;
	const desk = useQueueDesk();
	const { query } = desk.search;

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
					desk.selectSoleSearchResult();
				}
			}}
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
							<SearchIcon />
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
