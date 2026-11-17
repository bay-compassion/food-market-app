/**
 * Draws the location map on the Bay Point flyers (`public/flyers/bay-point/map.svg`) from OpenStreetMap data.
 * Run with `pnpm exec tsx scripts/generate-flyer-map.mts`.
 *
 * The map is drawn rather than captured from a tile server so it prints crisply at any size, and so
 * it carries only what a guest needs to place the market: Highway 4, the roads to the door, Bay
 * Point, and its BART station. Every label is a proper name, so one file serves every language.
 * OpenStreetMap data is ODbL-licensed; the attribution drawn in the corner is required.
 */
import { writeFile } from 'node:fs/promises';

interface Point {
	lat: number;
	lon: number;
}

interface Way {
	type: 'way';
	tags?: Record<string, string>;
	geometry?: Point[];
}

/** 4725 Evora Rd, as geocoded in `public/east-bay.geojson`. */
const market: Point = { lon: -121.982981, lat: 38.022937 };
const bounds = { west: -122.006, east: -121.934, south: 38.0075, north: 38.0405 };
const width = 360;

const cosLat = Math.cos((((bounds.north + bounds.south) / 2) * Math.PI) / 180);
const scale = width / ((bounds.east - bounds.west) * cosLat);
const height = Math.round((bounds.north - bounds.south) * scale);
const x = (lon: number) => (lon - bounds.west) * cosLat * scale;
const y = (lat: number) => (bounds.north - lat) * scale;

const overpassBox = [
	bounds.south - 0.01,
	bounds.west - 0.01,
	bounds.north + 0.01,
	bounds.east + 0.01,
].join(',');
const query = `[out:json][timeout:60];
(
	way["highway"~"^(motorway|motorway_link|trunk|primary|secondary|tertiary|residential|unclassified|living_street)$"](${overpassBox});
	way["railway"="subway"](${overpassBox});
);
out geom;`;

const response = await fetch('https://overpass-api.de/api/interpreter', {
	method: 'POST',
	body: new URLSearchParams({ data: query }),
	headers: { 'User-Agent': 'flyer-map-generator/1.0' },
});

if (!response.ok) {
	throw new Error(`Overpass answered ${response.status}: ${await response.text()}`);
}

const ways = ((await response.json()) as { elements: Way[] }).elements.filter(
	(element): element is Way & { geometry: Point[] } => element.type === 'way' && !!element.geometry,
);

/** Douglas–Peucker, in drawing units: detail finer than a quarter unit never reaches the page. */
function simplify(points: [number, number][], tolerance = 0.25): [number, number][] {
	if (points.length < 3) {
		return points;
	}

	const [ax, ay] = points[0]!;
	const [bx, by] = points.at(-1)!;
	const length = Math.hypot(bx - ax, by - ay) || 1;
	let furthest = 0;
	let index = 0;

	for (let i = 1; i < points.length - 1; i++) {
		const [px, py] = points[i]!;
		const distance = Math.abs((bx - ax) * (ay - py) - (ax - px) * (by - ay)) / length;

		if (distance > furthest) {
			furthest = distance;
			index = i;
		}
	}

	if (furthest <= tolerance) {
		return [points[0]!, points.at(-1)!];
	}

	return [
		...simplify(points.slice(0, index + 1), tolerance).slice(0, -1),
		...simplify(points.slice(index), tolerance),
	];
}

function path(selected: Way[]): string {
	return selected
		.map((way) => {
			const points = simplify(way.geometry!.map((p) => [x(p.lon), y(p.lat)]));

			return `M${points.map(([px, py]) => `${px.toFixed(1)} ${py.toFixed(1)}`).join('L')}`;
		})
		.join('');
}

const kind = (way: Way) => way.tags?.highway ?? way.tags?.railway ?? '';
const of = (...kinds: string[]) => ways.filter((way) => kinds.includes(kind(way)));

const streets = path(of('residential', 'unclassified', 'living_street', 'tertiary'));
const majorRoads = path(of('trunk', 'primary', 'secondary'));
const evora = path(ways.filter((way) => way.tags?.name === 'Evora Road'));
const ramps = path(of('motorway_link'));
const freeway = path(of('motorway'));
const bart = path(of('subway'));

/** A spot picked by eye on the drawing, for a label that sits beside a road rather than on it. */
const drawn = (dx: number, dy: number): Point => ({
	lon: bounds.west + dx / (cosLat * scale),
	lat: bounds.north - dy / scale,
});

const label = (
	at: Point,
	text: string,
	{ size = 9, weight = 500, fill = '#3d453f', anchor = 'middle', rotate = 0, spacing = 0 } = {},
) =>
	`<text x="${x(at.lon).toFixed(1)}" y="${y(at.lat).toFixed(1)}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${spacing}"${rotate ? ` transform="rotate(${rotate} ${x(at.lon).toFixed(1)} ${y(at.lat).toFixed(1)})"` : ''}>${text}</text>`;

/** A degree of latitude is 111 km everywhere, and the drawing is scaled in latitude degrees. */
const mileLength = (1.609 / 111) * scale;
const bartStation: Point = { lon: -121.9451489, lat: 38.0182952 };
const mx = x(market.lon);
const my = y(market.lat);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" font-family="Roboto, Arial, Helvetica, sans-serif">
<title>Map: the market at 4725 Evora Rd, on the west side of Bay Point, north of Highway 4</title>
<rect width="${width}" height="${height}" fill="#f4f1ea"/>
<g fill="none" stroke-linecap="round" stroke-linejoin="round">
<path d="${streets}" stroke="#d9d4c8" stroke-width="1"/>
<path d="${majorRoads}" stroke="#b9b2a2" stroke-width="2.2"/>
<path d="${evora}" stroke="#7ebdc5" stroke-width="3"/>
<path d="${bart}" stroke="#7a7368" stroke-width="1.2" stroke-dasharray="3 2"/>
<path d="${ramps}" stroke="#9a9283" stroke-width="1.6"/>
<path d="${freeway}" stroke="#275c63" stroke-width="4.5"/>
</g>
<g stroke="#f4f1ea" stroke-width="3" stroke-linejoin="round" paint-order="stroke">
${label({ lon: -121.9575, lat: 38.0335 }, 'BAY POINT', { size: 16, weight: 700, fill: '#1f2a24', spacing: 1.5 })}
${label(drawn(46, 141), 'Evora Rd', { size: 9, rotate: -24 })}
${label({ lon: -121.9548, lat: 38.0285 }, 'Willow Pass Rd', { size: 8.5 })}
${label({ lon: bartStation.lon, lat: bartStation.lat - 0.0028 }, 'Pittsburg/Bay Point', { size: 8.5, weight: 700, fill: '#1f2a24' })}
${label({ lon: bartStation.lon, lat: bartStation.lat - 0.0045 }, 'BART', { size: 8.5, weight: 700, fill: '#1f2a24' })}
</g>
<g transform="translate(222 114)">
<rect x="-11" y="-8" width="22" height="16" rx="3" fill="#fff" stroke="#275c63" stroke-width="1.5"/>
<text y="3.5" font-size="10" font-weight="700" fill="#275c63" text-anchor="middle">4</text>
</g>
<g transform="translate(${x(bartStation.lon).toFixed(1)} ${y(bartStation.lat).toFixed(1)})">
<rect x="-5" y="-5" width="10" height="10" rx="2" fill="#1f2a24"/>
<text y="3" font-size="7" font-weight="700" fill="#fff" text-anchor="middle">B</text>
</g>
<g transform="translate(${mx.toFixed(1)} ${my.toFixed(1)})">
<circle r="16" fill="#275c63" fill-opacity="0.18"/>
<path d="M0 0C-2-6-9-9-9-16a9 9 0 0 1 18 0c0 7-7 10-9 16z" fill="#275c63" stroke="#fff" stroke-width="1.5"/>
<circle cy="-16" r="3.5" fill="#fff"/>
</g>
<g transform="translate(${width - 16} 18)" fill="#3d453f">
<path d="M0-9L4 3 0 0-4 3z"/>
<text y="13" font-size="8" font-weight="700" text-anchor="middle">N</text>
</g>
<g transform="translate(10 ${height - 18})" fill="#3d453f" font-size="7.5">
<path d="M0 0v4h${mileLength.toFixed(1)}v-4" fill="none" stroke="#3d453f" stroke-width="1"/>
<text x="0" y="-3">1 mi</text>
</g>
<text x="${width - 6}" y="${height - 6}" font-size="6.5" fill="#6b6459" text-anchor="end">© OpenStreetMap contributors</text>
</svg>
`;

await writeFile(new URL('../public/flyers/bay-point/map.svg', import.meta.url), svg);
console.log(`Wrote public/flyers/bay-point/map.svg (${width} × ${height}).`);
