import { createFileRoute } from '@tanstack/react-router';

import { CreateGroupPage } from '../pages/create-group';

export const Route = createFileRoute('/create-group')({
  component: CreateGroupPage,
});
