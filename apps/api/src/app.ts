import { zValidator } from '@hono/zod-validator';
import { Hono, type Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import {
  adoptPetRequestSchema,
  carePetRequestSchema,
  claimDailyRewardRequestSchema,
  dailyGoalsQuerySchema,
  paymentIntentSchema,
  walletAddressSchema,
} from '@pawket/shared';
import { env } from './config';
import { EventService } from './services/event.service';
import { ItemService } from './services/item.service';
import { PaymentService } from './services/payment.service';
import { ApiError, PetService } from './services/pet.service';

type AppServices = {
  petService?: PetService;
  itemService?: ItemService;
  eventService?: EventService;
  paymentService?: PaymentService;
};

function validationHook(result: { success: boolean; error?: unknown }, c: Context) {
  if (!result.success) {
    return c.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed.',
          details: result.error,
        },
      },
      400,
    );
  }
}

export function createApp(services: AppServices = {}) {
  const petService = services.petService ?? new PetService();
  const itemService = services.itemService ?? new ItemService();
  const eventService = services.eventService ?? new EventService();
  const paymentService = services.paymentService ?? new PaymentService();
  const app = new Hono();

  app.onError((error, c) => {
    if (error instanceof ApiError) {
      return c.json(
        { error: { code: error.code, message: error.message, details: error.details } },
        error.status as never,
      );
    }
    if (error instanceof HTTPException) {
      return c.json(
        { error: { code: 'HTTP_ERROR', message: error.message } },
        error.status as never,
      );
    }
    console.error(error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Unexpected API error.' } }, 500);
  });

  app.get('/health', (c) => c.json({ ok: true, service: 'pawket-api' }));
  app.get('/version', (c) => c.json({ version: env.API_VERSION, app: 'Pawket' }));

  app.get('/pets/:walletAddress', async (c) => {
    const walletAddress = walletAddressSchema.parse(c.req.param('walletAddress'));
    return c.json(await petService.getPetByWallet(walletAddress));
  });

  app.post('/pets/adopt', zValidator('json', adoptPetRequestSchema, validationHook), async (c) =>
    c.json(await petService.adoptPet(c.req.valid('json')), 201),
  );

  app.post(
    '/pets/:petId/care',
    zValidator('json', carePetRequestSchema, validationHook),
    async (c) => c.json(await petService.careForPet(c.req.param('petId'), c.req.valid('json'))),
  );

  app.get(
    '/pets/:petId/daily-goals',
    zValidator('query', dailyGoalsQuerySchema, validationHook),
    async (c) =>
      c.json(
        await petService.getDailyGoals(c.req.param('petId'), c.req.valid('query').walletAddress),
      ),
  );

  app.post(
    '/pets/:petId/daily-goals/claim',
    zValidator('json', claimDailyRewardRequestSchema, validationHook),
    async (c) =>
      c.json(await petService.claimDailyReward(c.req.param('petId'), c.req.valid('json'))),
  );

  app.get('/pets/:petId/passport', async (c) =>
    c.json(await petService.getPassport(c.req.param('petId'))),
  );

  app.get('/items', async (c) => c.json({ items: await itemService.listItems() }));
  app.get('/events', async (c) => c.json({ events: await eventService.listEvents() }));
  app.post(
    '/payments/create-intent',
    zValidator('json', paymentIntentSchema, validationHook),
    async (c) => c.json(await paymentService.createIntent(c.req.valid('json')), 201),
  );
  app.post('/webhooks/mercuryo', (c) =>
    c.json({ accepted: false, reason: 'Webhook signature verification not configured.' }, 501),
  );
  app.post('/webhooks/solana', (c) =>
    c.json({ accepted: false, reason: 'Solana webhook/indexer verification not configured.' }, 501),
  );

  return app;
}

export const app = createApp();
