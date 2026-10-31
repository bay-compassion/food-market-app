# /// script
# requires-python = ">=3.12"
# dependencies = [
#   "fonttools[woff]",
#   "manifold3d",
#   "numpy",
#   "pillow",
#   "segno",
#   "shapely",
#   "svgelements",
#   "trimesh",
#   "uharfbuzz",
#   "zxing-cpp",
# ]
# ///
"""Build the check-in desk QR placard for a Bambu Lab A1 with AMS Lite.

    uv run signage/check-in-placard/build.py

Writes `placard.3mf` (a Bambu Studio project: white body, black artwork, teal logo icon),
`placard-foot.stl`, and `placard-preview.png` next to this file. See README.md.

The sign is modeled face-down: the front face sits at z=0 on the build plate and the artwork is
rotated so it reads correctly from the front. Colored artwork is a flush inlay in the first
INLAY_DEPTH of the plate, so filament changes happen only in the first few layers.
"""

import io
import json
import os
import subprocess
import tempfile
import zipfile
from pathlib import Path

import manifold3d as m3d
import numpy as np
import segno
import trimesh
import uharfbuzz as hb
import zxingcpp
from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw
from shapely import affinity
from shapely.geometry import MultiPolygon, Polygon, box
from shapely.ops import unary_union
from svgelements import SVG, Path as SvgPath

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]

URL = 'https://go.thebaycompassion.org/food-market/placard'
TITLE = 'Food Market'
LOGO_SVG = REPO / 'public/bay-compassion-primary.svg'
LOGO_TEAL = '#275c63'  # the icon's fill in LOGO_SVG; everything else in it is the wordmark
TITLE_FONT = REPO / 'public/fonts/area-normal-extrabold.woff2'

# Plate (mm)
W = 120.0  # height follows from the layout
CORNER_R = 8.0
THICKNESS = 3.0
INLAY_DEPTH = 0.6  # three 0.2 mm layers
BORDER_W = 1.2
BORDER_INSET = BORDER_W  # white rim outside the border matches the border

# Artwork
MODULE = 2.4
QR_INSET = 0.05  # counter first-layer squish on the dark modules
LOCKUP_W = 96.0
TITLE_CAP = 8.0
MARGIN = 9.0  # plate edge to lockup top, and title bottom to plate edge
QUIET = 4 * MODULE  # QR quiet zone; also the gap to the lockup and the title

# Feet: the slot holds the plate leaning back.
FOOT_L, FOOT_W, FOOT_H, SLOT_DEPTH, LEAN = 50.0, 14.0, 12.0, 9.0, 12.0
SLOT_CLEARANCE = 0.35

# Bambu Studio project. Parts not listed print in filament 2 (black).
BAMBU_STUDIO = Path(
	os.environ.get('BAMBU_STUDIO', '/Applications/BambuStudio.app/Contents/MacOS/BambuStudio')
)
BAMBU_PROFILES = BAMBU_STUDIO.parents[1] / 'Resources/profiles/BBL'
FILAMENTS = [
	('Bambu PLA Basic @BBL A1', '#FFFFFF'),
	('Bambu PLA Basic @BBL A1', '#000000'),
	# Bambu sells no teal; Oxide Green Metallic is the closest match to the brand's #275C63
	('Bambu PLA Metal @BBL A1', '#1D7C6A'),
]
PART_FILAMENT = {'body': 1, 'icon': 3}
BED_TYPE = 'Textured PEI Plate'


# --- 2D geometry ----------------------------------------------------------------------------
def rounded_rect(w, h, r, x0=0.0, y0=0.0):
	return box(x0 + r, y0 + r, x0 + w - r, y0 + h - r).buffer(r, resolution=32)


def even_odd(rings):
	shape = Polygon()
	for ring in rings:
		if len(ring) >= 3:
			shape = shape.symmetric_difference(Polygon(ring).buffer(0))
	return shape


def polys(g):
	return list(g.geoms) if isinstance(g, MultiPolygon) else [g]


def svg_shapes(svg_file):
	"""Return (icon, wordmark) in SVG units, y down."""
	icon, wordmark = [], []
	for el in SVG.parse(str(svg_file)).elements():
		if not isinstance(el, SvgPath):
			continue
		rings = []
		for sub in el.as_subpaths():
			sp = SvgPath(sub)
			n = max(16, int(sp.length(error=1e-2) / 4))
			rings.append([(p.x, p.y) for p in (sp.point(t) for t in np.linspace(0, 1, n))])
		(icon if str(el.fill).lower() == LOGO_TEAL else wordmark).append(even_odd(rings))
	return unary_union(icon), unary_union(wordmark)


def shaped_glyphs(font, text):
	"""Glyph names and pen x positions from HarfBuzz, so the font's GPOS kerning applies."""
	buf = io.BytesIO()
	font.flavor = None  # hand HarfBuzz plain OpenType, not WOFF2
	font.save(buf)
	hb_font = hb.Font(hb.Face(buf.getvalue()))
	hb_buf = hb.Buffer()
	hb_buf.add_str(text)
	hb_buf.guess_segment_properties()
	hb.shape(hb_font, hb_buf, {'kern': True, 'liga': True})
	order, x = font.getGlyphOrder(), 0
	for info, pos in zip(hb_buf.glyph_infos, hb_buf.glyph_positions):
		yield order[info.codepoint], x + pos.x_offset
		x += pos.x_advance


def flatten_contour(ops, x):
	"""Turn recorded pen operations into polygon rings, offset by x."""
	rings, ring = [], []
	for op, args in ops:
		if op == 'moveTo':
			ring = [args[0]]
		elif op == 'lineTo':
			ring.append(args[0])
		elif op == 'curveTo':
			p0, p1, p2, p3 = map(np.array, [ring[-1], *args])
			for t in np.linspace(0, 1, 12)[1:]:
				ring.append(
					tuple(
						(1 - t) ** 3 * p0
						+ 3 * (1 - t) ** 2 * t * p1
						+ 3 * (1 - t) * t**2 * p2
						+ t**3 * p3
					)
				)
		elif op == 'qCurveTo':
			# TrueType implied on-curve points between consecutive off-curve points
			offs, end = [np.array(p) for p in args[:-1]], np.array(args[-1])
			p0 = np.array(ring[-1])
			for i, c in enumerate(offs):
				p2 = end if i == len(offs) - 1 else (c + offs[i + 1]) / 2
				for t in np.linspace(0, 1, 8)[1:]:
					ring.append(tuple((1 - t) ** 2 * p0 + 2 * (1 - t) * t * c + t**2 * p2))
				p0 = p2
		elif op in ('closePath', 'endPath'):
			rings.append([(px + x, py) for px, py in ring])
	return rings


def text_shape(text, font_file, cap_height):
	"""Outline `text` with its cap height scaled to `cap_height`, y up."""
	font = TTFont(str(font_file))
	glyphs = font.getGlyphSet()
	cap = font['OS/2'].sCapHeight or font['head'].unitsPerEm * 0.7
	shapes = []
	for name, x in shaped_glyphs(font, text):
		pen = DecomposingRecordingPen(glyphs)
		glyphs[name].draw(pen)
		shapes.append(even_odd(flatten_contour(pen.value, x)))
	s = cap_height / cap
	return affinity.scale(unary_union(shapes), s, s, origin=(0, 0))


def layout_sign():
	"""Lay out the artwork in y-down sign space. Returns (height, plate, artwork by part)."""
	svg_icon, svg_word = svg_shapes(LOGO_SVG)
	lockup = unary_union([svg_icon, svg_word])
	minx, miny, maxx, _ = lockup.bounds
	s = LOCKUP_W / (maxx - minx)

	def place_lockup(g):  # one transform for both, so they stay registered
		g = affinity.scale(affinity.translate(g, -minx, -miny), s, s, origin=(0, 0))
		return affinity.translate(g, (W - LOCKUP_W) / 2, MARGIN)

	icon, wordmark = place_lockup(svg_icon), place_lockup(svg_word)

	qr = segno.make_qr(URL, error='q', boost_error=False)
	qr_size = len(qr.matrix) * MODULE
	qr_x0, qr_top = (W - qr_size) / 2, unary_union([icon, wordmark]).bounds[3] + QUIET + 0.2
	cells = [
		box(
			qr_x0 + c * MODULE,
			qr_top + r * MODULE,
			qr_x0 + (c + 1) * MODULE,
			qr_top + (r + 1) * MODULE,
		)
		for r, row in enumerate(qr.matrix)
		for c, dark in enumerate(row)
		if dark
	]
	qr_shape = unary_union(cells).buffer(-QR_INSET, join_style='mitre')

	title = affinity.scale(text_shape(TITLE, TITLE_FONT, TITLE_CAP), 1, -1, origin=(0, 0))
	tminx, tminy, tmaxx, _ = title.bounds
	title = affinity.translate(title, W / 2 - (tminx + tmaxx) / 2, qr_top + qr_size + QUIET + 0.2 - tminy)
	# drop near-duplicate points from curve flattening; they collapse in float32 STL output
	title = title.simplify(0.01)

	h = round(title.bounds[3] + MARGIN, 1)
	outer = rounded_rect(
		W - 2 * BORDER_INSET, h - 2 * BORDER_INSET, CORNER_R - BORDER_INSET, BORDER_INSET, BORDER_INSET
	)
	border = outer.difference(outer.buffer(-BORDER_W, resolution=32))
	plate = rounded_rect(W, h, CORNER_R)
	artwork = {'qr': qr_shape, 'wordmark': wordmark, 'icon': icon, 'title': title, 'border': border}

	quiet = box(qr_x0 - QUIET, qr_top - QUIET, qr_x0 + qr_size + QUIET, qr_top + qr_size + QUIET)
	for name, g in artwork.items():
		assert plate.contains(g), f'{name} runs off the plate'
		assert name == 'qr' or not quiet.intersects(g), f'{name} intrudes on the QR quiet zone'
	print(f'QR version {qr.version}, {len(qr.matrix)} modules, {qr_size:.1f} mm; plate {W:.0f} × {h} mm')
	return h, plate, artwork


# --- 3D -----------------------------------------------------------------------------------
def build_parts(h, plate, artwork):
	def extrude(g, height):
		# y-down layout to face-down print space: a half turn about the plate's center, which
		# reads correctly when the printed face is viewed from below the build plate
		g = affinity.scale(g, -1, -1, origin=(W / 2, h / 2))
		contours = []
		for p in polys(g):
			contours.append(np.array(p.exterior.coords[:-1]))
			contours.extend(np.array(i.coords[:-1]) for i in p.interiors)
		return m3d.Manifold.extrude(m3d.CrossSection(contours, m3d.FillRule.EvenOdd), height)

	inlays = {name: extrude(g, INLAY_DEPTH) for name, g in artwork.items()}
	body = extrude(plate, THICKNESS)
	for inlay in inlays.values():
		body = body - inlay
	return {'body': body, **inlays}


def build_foot():
	slot_w = THICKNESS + SLOT_CLEARANCE
	slot = (
		m3d.Manifold.cube([slot_w, FOOT_W + 2, 40])
		.translate([-slot_w / 2, -1, 0])
		.rotate([0, -LEAN, 0])
		.translate([FOOT_L * 0.42, 0, FOOT_H - SLOT_DEPTH])
	)
	return m3d.Manifold.cube([FOOT_L, FOOT_W, FOOT_H]) - slot


def to_trimesh(man):
	assert man.status() == m3d.Error.NoError
	mesh = man.to_mesh()
	return trimesh.Trimesh(vertices=mesh.vert_properties[:, :3], faces=mesh.tri_verts, process=False)


# --- Proof --------------------------------------------------------------------------------
def render_front(h, parts, out_file):
	"""Render the printed face from slices of the actual meshes, seen from below the build plate.

	Viewed from below, image column = W - X and image row = h - Y, so the text reads correctly
	only if the artwork was turned the right way.
	"""
	px = 10
	colours = {name: '#000000' for name in parts}
	colours |= {'body': '#FFFFFF', 'icon': '#275C63'}
	img = Image.new('RGB', (int(W * px), int(h * px)), '#C8C8C8')
	for name, man in parts.items():
		mask = Image.new('L', img.size, 0)
		draw = ImageDraw.Draw(mask)
		for p in polys(even_odd(man.slice(INLAY_DEPTH / 2).to_polygons())):
			draw.polygon([((W - x) * px, (h - y) * px) for x, y in p.exterior.coords], fill=255)
			for i in p.interiors:
				draw.polygon([((W - x) * px, (h - y) * px) for x, y in i.coords], fill=0)
		img.paste(colours[name], mask=mask)
	img.save(out_file)

	for size in (img.size, (240, round(240 * img.height / img.width))):
		decoded = [b.text for b in zxingcpp.read_barcodes(img.resize(size))]
		assert decoded == [URL], f'QR decodes as {decoded} at {size}'
	print(f'QR decodes to {URL}')


# --- Bambu Studio project -----------------------------------------------------------------
def system_presets():
	by_name = {}
	for kind in ('machine', 'process', 'filament'):
		for f in (BAMBU_PROFILES / kind).rglob('*.json'):
			data = json.loads(f.read_text())
			if 'name' in data:
				by_name[data['name']] = data
	return by_name


def write_preset(presets, name, out_file, **overrides):
	"""Write a system preset with its `inherits` chain resolved; the CLI needs every key."""

	def flatten(n):
		data = presets[n]
		merged = flatten(data['inherits']) if data.get('inherits') else {}
		return merged | data

	data = flatten(name) | overrides | {'from': 'system'}
	data.pop('inherits', None)
	out_file.write_text(json.dumps(data, indent=2))
	return out_file


def export_project(stl_files, work, out_file):
	presets = system_presets()
	settings = [
		write_preset(presets, 'Bambu Lab A1 0.4 nozzle', work / 'machine.json'),
		write_preset(presets, '0.20mm Standard @BBL A1', work / 'process.json'),
	]
	filaments = [
		write_preset(presets, name, work / f'filament-{i}.json', filament_colour=[colour])
		for i, (name, colour) in enumerate(FILAMENTS, 1)
	]
	staged = work / 'project.3mf'
	subprocess.run(
		[
			str(BAMBU_STUDIO),
			'--assemble',
			'--load-settings',
			';'.join(map(str, settings)),
			'--load-filaments',
			';'.join(map(str, filaments)),
			'--load-filament-ids',
			','.join(str(PART_FILAMENT.get(name, 2)) for name in stl_files),
			'--export-3mf',
			str(staged),
			*map(str, stl_files.values()),
		],
		cwd=work,  # the CLI drops a result.json in its working directory
		check=True,
		capture_output=True,
	)

	# The CLI has no option for the build plate, and defaults to a Cool Plate the A1 lacks.
	with zipfile.ZipFile(staged) as zin, zipfile.ZipFile(out_file, 'w', zipfile.ZIP_DEFLATED) as zout:
		for item in zin.infolist():
			data = zin.read(item.filename)
			if item.filename == 'Metadata/project_settings.config':
				settings_json = json.loads(data)
				settings_json['curr_bed_type'] = BED_TYPE
				data = json.dumps(settings_json, indent=4).encode()
			zout.writestr(item, data)


def main():
	h, plate, artwork = layout_sign()
	parts = build_parts(h, plate, artwork)
	render_front(h, parts, HERE / 'placard-preview.png')
	to_trimesh(build_foot()).export(HERE / 'placard-foot.stl')

	if not BAMBU_STUDIO.exists():
		raise SystemExit(f'Bambu Studio not found at {BAMBU_STUDIO}; set BAMBU_STUDIO to its binary')
	with tempfile.TemporaryDirectory() as tmp:
		work = Path(tmp)
		stl_files = {}
		for name, man in parts.items():
			stl_files[name] = work / f'placard-{name}.stl'
			to_trimesh(man).export(stl_files[name])
		export_project(stl_files, work, HERE / 'placard.3mf')
	print(f'Wrote {HERE / "placard.3mf"}')


if __name__ == '__main__':
	main()
