import { Router } from "express";
import { aceSyncController } from "./controllers/sync.controller";
import { dwellingController } from "./controllers/dwelling.controller";

export const aceRouter = Router();

// ACE Module - Sync API
aceRouter.post("/sync", async (req, res) => {
  await aceSyncController.sync(req, res);
});

// ACE Module - Dwelling API
aceRouter.post("/dwellings", async (req, res) => {
  await dwellingController.createDwelling(req, res);
});
