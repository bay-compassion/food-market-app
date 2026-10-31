import styled from '@emotion/styled';
import { useId } from 'react';

const Address = styled.div`
	display: grid;
	gap: 4px;

	.label {
		font-size: 13px;
		font-weight: 700;
	}

	/* Shown without the scheme, as a worker would type it; long hosts wrap rather than overflow. */
	.address {
		color: var(--color-brand-dark);
		font-size: 18px;
		font-weight: 700;
		overflow-wrap: anywhere;
		user-select: all;
	}
`;

/**
 * A page of this app, written out for a worker to type into another computer's browser. It uses
 * this deploy's own host, so a preview site names itself rather than production.
 */
export function ChecklistAddress({ label, path }: { label: string; path: string }) {
	const labelId = useId();

	return (
		<Address>
			<span className="label" id={labelId}>
				{label}
			</span>
			<span className="address" aria-labelledby={labelId}>
				{`${window.location.host}${path}`}
			</span>
		</Address>
	);
}
