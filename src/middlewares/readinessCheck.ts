import express, { Request, Response } from 'express';

const router = express.Router();

router.get('/readiness', (req: Request, res: Response) => {
  const body = {
    status: 'ok',
  };
  res.status(200).send(JSON.stringify(body));
});

export default router;
