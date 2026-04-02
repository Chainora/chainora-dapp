import { createFileRoute } from '@tanstack/react-router';

import { LandingPage } from '../pages/index';

export const Route = createFileRoute('/')({
  component: LandingPage,
});
