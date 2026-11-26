import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';

import { adminTranslations } from '../../adminLocales';
import { SearchIcon } from './SearchIcon';
import { useOpenSearch } from './use-open-search';

const Opener = styled.button`
	display: flex;
	flex: 1;
	gap: 10px;
	align-items: center;
	min-width: 0;
	min-height: 48px;
	padding: 0 16px;
	border: 1px solid var(--color-border-soft);
	border-radius: var(--radius-pill);
	color: var(--color-text-subtle);
	background: var(--color-background);
	font: inherit;
	font-size: 15px;
	text-align: start;
	cursor: text;

	span {
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}
`;

/**
 * Looks like a field, so it reads as where to search a ticket list; it opens the search dialog,
 * as `/` does from the keyboard.
 */
export const SearchOpener = observer(function SearchOpener({ label }: { label: string }) {
	const t = adminTranslations.en.queueDesk;
	const openSearch = useOpenSearch();

	return (
		<Opener
			type="button"
			className="search-opener"
			aria-label={label}
			aria-keyshortcuts="/"
			aria-haspopup="dialog"
			onClick={openSearch}
		>
			<SearchIcon />
			<span aria-hidden="true">{t.searchPlaceholder}</span>
		</Opener>
	);
});
