import styled from '@emotion/styled';

import { adminTranslations } from '../../adminLocales';
import { FloorPlanViewer } from './FloorPlanViewer';

/** The lobby, the front of the auditorium, and the start of the hallways either side. */
const floorPlanUrl = '/floor-plans/concord-market-area.svg';

const Section = styled.section`
	display: grid;
	gap: 8px;

	h2 {
		margin: 0;
	}
`;

/**
 * Where the plan opens: the check-in desk and the room display, in the plan's units (its viewBox is
 * 113 98 294 170), as fractions of the whole. It runs on past the room display's label to the right,
 * so the zoom buttons laid over that edge don't cover it.
 */
const setupArea = {
	x: (183 - 113) / 294,
	y: (180 - 98) / 170,
	width: 113 / 294,
	height: 47 / 170,
};

/**
 * Where at the church the market is set up, ahead of the steps that say what to set up there. The
 * plan's numbered marks are drawn into the SVG and match the step numbers in `ChecklistView`. On a
 * phone its labels are small, so it opens zoomed in on the two stations and zooms and pans in place.
 * Staff know the room, so it carries no legend.
 */
export function ChecklistFloorPlan() {
	const t = adminTranslations.en.checklist.floorPlan;

	return (
		<Section className="admin-section">
			<h2>{t.title}</h2>
			<FloorPlanViewer src={floorPlanUrl} alt={t.alt} width={294} height={170} focus={setupArea} />
		</Section>
	);
}
