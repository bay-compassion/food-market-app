import styled from '@emotion/styled';
import { Link } from 'react-router';

const Frame = styled.main`
	display: flex;
	flex-direction: column;
	gap: 12px;
	max-width: 480px;
	margin-inline: auto;
	padding: 48px 16px;
	color: var(--color-text);

	h1 {
		margin: 0;
		color: var(--color-brand-dark);
		font-family: var(--font-heading);
		font-size: 30px;
		line-height: 1.1;
	}

	p {
		margin: 0;
		color: var(--color-text-muted);
	}

	a {
		color: var(--color-brand);
		font-weight: 700;
	}
`;

/** Deliberately says nothing of what this page is, to anyone without the role. */
export function NoAccess() {
	return (
		<Frame>
			<h1>You Don't Have Access to This Page</h1>
			<p>If you got here by mistake, you can go back to the home page.</p>
			<Link to="/">Go Home</Link>
		</Frame>
	);
}
