import { serve } from '@hono/node-server';
import { app } from './app';
import { env } from './config';
serve({ fetch: app.fetch, hostname: env.API_HOST, port: env.API_PORT }, (info) =>
  console.log(`Pawket API listening on http://${info.address}:${info.port}`),
);
