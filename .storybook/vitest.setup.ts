import { setProjectAnnotations } from '@storybook/react-vite';
import { beforeAll } from 'vitest';

import preview from './preview';

/**
 * Teaches the story test run about this Storybook's configuration.
 *
 * Without it the stories would render without `preview.tsx` — no stylesheets, no page shell, no
 * locale decorator — and would fail for reasons that have nothing to do with the components.
 */
const project = setProjectAnnotations([preview]);

beforeAll(project.beforeAll);
