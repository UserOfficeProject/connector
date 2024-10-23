import express, { Request, Response } from 'express';
import { collectDefaultMetrics, register } from 'prom-client';

collectDefaultMetrics();

const router = express.Router();

router.get('/metrics', async (req: Request, res: Response) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

export default router;
