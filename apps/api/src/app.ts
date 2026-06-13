import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import {
  adoptPetSchema,
  careActionSchema,
  paymentIntentSchema,
  walletAddressSchema,
} from '@pawket/shared';
import { env } from './config';
import { EventService } from './services/event.service';
import { ItemService } from './services/item.service';
import { PaymentService } from './services/payment.service';
import { PetService } from './services/pet.service';

const petService = new PetService();
const itemService = new ItemService();
const eventService = new EventService();
const paymentService = new PaymentService();
export const app = new Hono();
app.get('/health', (c) => c.json({ ok: true, service: 'pawket-api' }));
app.get('/version', (c) => c.json({ version: env.API_VERSION, app: 'Pawket' }));
app.get('/pets/:walletAddress', async (c) => {
  const walletAddress = walletAddressSchema.parse(c.req.param('walletAddress'));
  return c.json(await petService.getPets(walletAddress));
});
app.post('/pets/adopt', zValidator('json', adoptPetSchema), async (c) =>
  c.json(await petService.adoptPet(c.req.valid('json')), 201),
);
app.post('/pets/:petId/care', zValidator('json', careActionSchema), async (c) =>
  c.json(await petService.careForPet(c.req.param('petId'), c.req.valid('json'))),
);
app.get('/pets/:petId/passport', async (c) =>
  c.json(await petService.getPassport(c.req.param('petId'))),
);
app.get('/items', async (c) => c.json({ items: await itemService.listItems() }));
app.get('/events', async (c) => c.json({ events: await eventService.listEvents() }));
app.post('/payments/create-intent', zValidator('json', paymentIntentSchema), async (c) =>
  c.json(await paymentService.createIntent(c.req.valid('json')), 201),
);
app.post('/webhooks/mercuryo', (c) =>
  c.json({ accepted: false, reason: 'Webhook signature verification not configured.' }, 501),
);
app.post('/webhooks/solana', (c) =>
  c.json({ accepted: false, reason: 'Solana webhook/indexer verification not configured.' }, 501),
);
