import styled from '@emotion/styled';

import { adminTranslations } from '../../adminLocales';
import { FloorPlanViewer } from './FloorPlanViewer';

/**
 * The lobby, the front of the auditorium, and the start of the hallways either side: the file, and
 * the part of the campus map it was cropped from (its `viewBox`), in the map's units.
 */
export const concordFloorPlan = {
	src: '/floor-plans/concord-market-area.svg',
	x: 113,
	y: 98,
	width: 294,
	height: 170,
};

/** Where each station's numbered mark is drawn on the plan, in its units. */
export const stationMarks = {
	roomDisplay: { x: 244, y: 186 },
	checkIn: { x: 212, y: 219 },
};

const Section = styled.section`
	display: grid;
	gap: 10px;

	h2 {
		margin: 0;
	}
`;

/**
 * Where the plan opens: the check-in desk and the room display, as fractions of the whole. It runs
 * on past the room display's label to the right, so the zoom buttons laid over that edge don't
 * cover it.
 */
const setupArea = {
	x: (183 - concordFloorPlan.x) / concordFloorPlan.width,
	y: (180 - concordFloorPlan.y) / concordFloorPlan.height,
	width: 113 / concordFloorPlan.width,
	height: 47 / concordFloorPlan.height,
};

/**
 * Where at the church the market is set up, ahead of the stations that say what to set up there. The
 * plan's numbered marks are drawn into the SVG and match the station numbers in `ChecklistView`. On
 * a phone its labels are small, so it opens zoomed in on the two stations and zooms and pans in
 * place. Staff know the room, so it carries no legend.
 */
export function ChecklistFloorPlan() {
	const t = adminTranslations.en.checklist.floorPlan;
	const { src, width, height } = concordFloorPlan;

	return (
		<Section className="admin-section">
			<h2>{t.title}</h2>
			<FloorPlanViewer src={src} alt={t.alt} width={width} height={height} focus={setupArea} />
		</Section>
	);
}
