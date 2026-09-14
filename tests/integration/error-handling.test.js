import request from 'supertest';
import { test, expect } from 'vitest';

test('a rejected DB query returns a clean 500 instead of hanging', async () => {
  const { createApp } = await import('../../server/index.js');
  const brokenPool = {
    query: async () => {
      throw new Error('Unknown column `desc` in field list');
    },
  };
  const app = createApp(brokenPool);

  const res = await request(app).get('/api/rituals');
  expect(res.status).toBe(500);
  expect(res.body).toEqual({ error: 'Internal server error.' });
});
