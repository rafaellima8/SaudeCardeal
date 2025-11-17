import { Router } from "express";
import { aceSyncController } from "./controllers/sync.controller";

export const aceRouter = Router();

// ACE Module - Sync API
aceRouter.post("/sync", async (req, res) => {
  await aceSyncController.sync(req, res);
});
