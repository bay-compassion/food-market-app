import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

/**
 * Unmounts anything left behind by `@testing-library/react`. Its automatic cleanup only registers
 * when Vitest's globals are enabled, and this project imports `afterEach` explicitly instead.
 */
afterEach(cleanup);
