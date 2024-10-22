import express, { Request, Response } from 'express';
import promClient from 'prom-client';

const collectDefaultMetrics = promClient.collectDefaultMetrics;

collectDefaultMetrics();

const register = promClient.register;

const router = express.Router();

router.get('/metrics', async (req: Request, res: Response) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

export default router;
