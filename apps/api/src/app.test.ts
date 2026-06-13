import { describe, expect, it } from 'vitest';
import { app } from './app';

describe('api', () => {
  it('responds to health', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true });
  });
  it('validates adopt input', async () => {
    const res = await app.request('/pets/adopt', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'content-type': 'application/json' },
    });
    expect(res.status).toBe(400);
  });
});
