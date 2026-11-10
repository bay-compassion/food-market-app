// Draws an SVG onto a transparent 1024-pixel canvas, inset to the margin macOS leaves around an app
// icon, and writes it as a PNG. Used by make-icon.sh; Quick Look would render it onto white.
//
//   swift render-icon.swift input.svg output.png

import AppKit

let arguments = CommandLine.arguments
guard arguments.count == 3, let svg = NSImage(contentsOfFile: arguments[1]) else {
	FileHandle.standardError.write("usage: render-icon.swift input.svg output.png\n".data(using: .utf8)!)
	exit(1)
}

// The logo is a circle filling its whole canvas. At 832 of 1024 it stays inside the icon margin
// and as large as its neighbours in the Dock.
let canvas = 1024
let artwork = 832
let inset = (canvas - artwork) / 2

let bitmap = NSBitmapImageRep(
	bitmapDataPlanes: nil,
	pixelsWide: canvas,
	pixelsHigh: canvas,
	bitsPerSample: 8,
	samplesPerPixel: 4,
	hasAlpha: true,
	isPlanar: false,
	colorSpaceName: .deviceRGB,
	bytesPerRow: 0,
	bitsPerPixel: 0
)!

NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: bitmap)
svg.draw(in: NSRect(x: inset, y: inset, width: artwork, height: artwork))
NSGraphicsContext.restoreGraphicsState()

try bitmap.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: arguments[2]))
