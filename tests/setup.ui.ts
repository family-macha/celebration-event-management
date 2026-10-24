import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Vitest does not register Testing Library's automatic cleanup unless globals are on.
afterEach(() => {
  cleanup();
});
