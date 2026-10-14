/**
 * The guest phone in the guest guide: the guest app's own screens in a frame of their own, which
 * the guide's page drives through `window.phone` (see `scene.ts`).
 */
import '../../../src/styles/base.css';
import '../../../src/styles/app-shell.css';
import './phone.css';
import { PhoneDevice } from './device.tsx';

const root = document.getElementById('root');

if (!root) {
	throw new Error('The phone has no #root.');
}

window.phone = new PhoneDevice(root);
