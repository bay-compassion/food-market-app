import styled from '@emotion/styled';
import { Table, TableBody } from '@mui/material';
import type { ReactNode } from 'react';

export type QueueGuestTableProps = {
	/** Names the table for assistive technology; the visible heading sits outside it. */
	label: string;
	children: ReactNode;
};

/*
 * MUI's cells bring their own padding, border, and type size; those are reset so a row keeps the
 * two-line look the queue screen was designed around, with the rule drawn on the row instead.
 */
const GuestTable = styled(Table)`
	table-layout: auto;

	.MuiTableCell-root {
		padding: 10px 0;
		border: 0;
		color: inherit;
		font-size: inherit;
		line-height: inherit;
		vertical-align: middle;
	}

	.MuiTableRow-root {
		border-top: 1px solid #dce3df;
	}
`;

/** The rows of one queue list, as a real table so each list reads as one for assistive technology. */
export function QueueGuestTable({ label, children }: QueueGuestTableProps) {
	return (
		<GuestTable className="guest-list" aria-label={label}>
			<TableBody>{children}</TableBody>
		</GuestTable>
	);
}
