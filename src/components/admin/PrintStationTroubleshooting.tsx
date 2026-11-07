import styled from '@emotion/styled';

import { adminTranslations } from '../../adminLocales';
import { ChecklistDisclosure } from './ChecklistDisclosure';

const Fix = styled.p`
	margin: 0;
	color: var(--color-text-muted);
	line-height: 1.5;
`;

/** Every problem a step can link to, so the card holding them opens for the link too. */
export const troubleshootingTopics = adminTranslations.en.printStationCard.troubleshooting.flatMap(
	({ id }) => (id ? [id] : []),
);

/**
 * The market's usual failures, each folded under its symptom, with what to do about it. A problem
 * with an `id` opens and scrolls into view when a step links to it.
 */
export function PrintStationTroubleshooting() {
	const t = adminTranslations.en.printStationCard;

	return (
		<div>
			{t.troubleshooting.map(({ id, problem, fix }) => (
				<ChecklistDisclosure key={problem} summary={problem} topics={id ? [id] : undefined} isTopic>
					<Fix>{fix.replaceAll('{host}', window.location.host)}</Fix>
				</ChecklistDisclosure>
			))}
		</div>
	);
}
