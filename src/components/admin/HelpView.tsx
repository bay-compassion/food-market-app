import styled from '@emotion/styled';

import { adminTranslations } from '../../adminLocales';
import { ChecklistReference } from './ChecklistReference';
import { HelpBackupPlans } from './HelpBackupPlans';

const Layout = styled.div`
	display: grid;
	gap: 16px;

	/* The view's own spacing replaces the sections' bottom margins. */
	.admin-section {
		margin-bottom: 0;
	}

	.intro {
		margin: 0;
		color: var(--color-text-muted);
		line-height: 1.5;
	}
`;

/**
 * Everything a team leader needs only when something goes wrong, or on a new computer: the backup
 * plans first, then the fixes, starting the printing station by hand, and first-time setup. A link
 * on the Checklist can open a fix here (`ChecklistStore.reveal`); the request outlives the move
 * between screens, so the fix opens once this view is drawn.
 */
export function HelpView() {
	const t = adminTranslations.en.help;

	return (
		<Layout>
			<p className="intro">{t.intro}</p>
			<HelpBackupPlans />
			<ChecklistReference />
		</Layout>
	);
}
