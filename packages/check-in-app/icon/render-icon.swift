// Draws the app's icon on Apple's macOS app icon grid and writes it as a 1024-pixel PNG: a teal
// rounded square, inset from the canvas edge, with The Bay Compassion logo on it in reverse — a
// white disc with the C and leaves cut out of it in teal. Used by make-icon.ts.
//
//   swift render-icon.swift logo.svg output.png

import AppKit

let arguments = CommandLine.arguments
guard arguments.count == 3, var svg = try? String(contentsOfFile: arguments[1], encoding: .utf8)
else {
	FileHandle.standardError.write("usage: render-icon.swift logo.svg output.png\n".data(using: .utf8)!)
	exit(1)
}

let teal = "#275c63"

// The logo is a white disc under a teal one with the C and leaves cut out of it. Swapping the two
// fills reverses it.
svg = svg
	.replacingOccurrences(of: "fill=\"#fff\"", with: "fill=\"__TEAL__\"")
	.replacingOccurrences(of: "fill=\"\(teal)\"", with: "fill=\"#fff\"")
	.replacingOccurrences(of: "fill=\"__TEAL__\"", with: "fill=\"\(teal)\"")

guard let logo = NSImage(data: svg.data(using: .utf8)!) else {
	FileHandle.standardError.write("couldn't read the logo\n".data(using: .utf8)!)
	exit(1)
}

// Apple's grid for a macOS app icon: a 1024-point canvas, the icon's body an 824-point rounded
// square 100 points in from each edge, with a corner radius of 185.4, and a soft shadow below.
let canvas: CGFloat = 1024
let body = NSRect(x: 100, y: 100, width: 824, height: 824)
let cornerRadius: CGFloat = 185.4
// The logo's disc, centred on the body, with room around it like other icons' glyphs.
let logoSize: CGFloat = 600

let bitmap = NSBitmapImageRep(
	bitmapDataPlanes: nil,
	pixelsWide: Int(canvas),
	pixelsHigh: Int(canvas),
	bitsPerSample: 8,
	samplesPerPixel: 4,
	hasAlpha: true,
	isPlanar: false,
	colorSpaceName: .deviceRGB,
	bytesPerRow: 0,
	bitsPerPixel: 0
)!

func color(_ hex: Int) -> NSColor {
	NSColor(
		srgbRed: CGFloat((hex >> 16) & 0xff) / 255,
		green: CGFloat((hex >> 8) & 0xff) / 255,
		blue: CGFloat(hex & 0xff) / 255,
		alpha: 1
	)
}

NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: bitmap)

let shape = NSBezierPath(roundedRect: body, xRadius: cornerRadius, yRadius: cornerRadius)

// The shadow, drawn once under the body.
NSGraphicsContext.saveGraphicsState()
let shadow = NSShadow()
shadow.shadowColor = NSColor.black.withAlphaComponent(0.3)
shadow.shadowOffset = NSSize(width: 0, height: -10)
shadow.shadowBlurRadius = 20
shadow.set()
color(0x275c63).setFill()
shape.fill()
NSGraphicsContext.restoreGraphicsState()

// The body: the logo's teal, a shade lighter at the top, as light falls on Apple's own icons.
NSGradient(starting: color(0x2f6d75), ending: color(0x214f55))!.draw(in: shape, angle: -90)

logo.draw(
	in: NSRect(
		x: body.midX - logoSize / 2,
		y: body.midY - logoSize / 2,
		width: logoSize,
		height: logoSize
	)
)

NSGraphicsContext.restoreGraphicsState()

try bitmap.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: arguments[2]))
