/**
 * The admin dashboard in the admin guide: the dashboard's own screens in a frame of their own,
 * which the guide's page drives through `window.admin` (see `scene.ts`).
 */
import '../../../src/styles/base.css';
import '../../../src/styles/app-shell.css';
import '../../../src/styles/admin.css';
import '../phone/phone.css';
import { AdminDevice } from './device.tsx';

const root = document.getElementById('root');

if (!root) {
	throw new Error('The admin frame has no #root.');
}

window.admin = new AdminDevice(root);
