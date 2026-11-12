import styled from '@emotion/styled';

import { adminTranslations } from '../../adminLocales';

const Plans = styled.section`
	display: grid;
	gap: 12px;

	h2 {
		margin: 0;
	}

	.intro {
		margin: 0;
		color: var(--color-text-muted);
		line-height: 1.5;
	}

	ol {
		display: grid;
		gap: 10px;
		margin: 0;
		padding: 0;
		list-style: none;
		counter-reset: plan;
	}

	li {
		display: grid;
		grid-template-columns: 32px minmax(0, 1fr);
		gap: 4px 12px;
		padding: 12px 14px;
		border-radius: var(--radius-md);
		background: var(--color-surface-soft);
		counter-increment: plan;
	}

	li::before {
		content: counter(plan);
		grid-row: span 2;
		display: grid;
		place-items: center;
		width: 32px;
		height: 32px;
		border-radius: 50%;
		color: var(--color-surface);
		background: var(--color-brand);
		font-weight: 700;
	}

	.when {
		margin: 0;
		font-weight: 700;
	}

	.instead {
		margin: 0;
		color: var(--color-text-muted);
		line-height: 1.45;
	}
`;

/**
 * What to do instead when a station can't be set up or stops working: each plan is the fallback for
 * the one before it, ending with the deli counter tickets for when the app itself is down. Shown
 * open, not folded, since it is what someone opens Help for in a hurry.
 */
export function HelpBackupPlans() {
	const t = adminTranslations.en.help.backupPlans;

	return (
		<Plans className="admin-section" aria-labelledby="backup-plans-heading">
			<h2 id="backup-plans-heading">{t.title}</h2>
			<p className="intro">{t.intro}</p>
			<ol>
				{t.plans.map(({ when, instead }) => (
					<li key={when}>
						<p className="when">{when}</p>
						<p className="instead">{instead}</p>
					</li>
				))}
			</ol>
		</Plans>
	);
}
