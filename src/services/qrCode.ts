import qrcode from 'qrcode-generator';

/**
 * Renders `url` as a scalable QR code SVG string. `scalable: true` drops the fixed pixel
 * width/height in favor of a viewBox, so the caller can size it with CSS.
 */
export function createQrCodeSvg(url: string): string {
	const qr = qrcode(0, 'M');

	qr.addData(url);
	qr.make();

	return qr.createSvgTag({ scalable: true });
}
