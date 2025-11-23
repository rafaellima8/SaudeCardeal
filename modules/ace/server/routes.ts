import { Router } from "express";
import { aceSyncController } from "./controllers/sync.controller";
import { dwellingController } from "./controllers/dwelling.controller";
import { aceStatsController } from "./controllers/stats.controller";

export const aceRouter = Router();

// ACE Module - Sync API
aceRouter.post("/sync", async (req, res) => {
  await aceSyncController.sync(req, res);
});

// ACE Module - Dwelling API
aceRouter.get("/dwellings", async (req, res) => {
  await dwellingController.listDwellings(req, res);
});

aceRouter.get("/dwellings/:id", async (req, res) => {
  await dwellingController.getDwellingById(req, res);
});

aceRouter.post("/dwellings", async (req, res) => {
  await dwellingController.createDwelling(req, res);
});

aceRouter.patch("/dwellings/:id", async (req, res) => {
  await dwellingController.updateDwelling(req, res);
});

aceRouter.delete("/dwellings/:id", async (req, res) => {
  await dwellingController.deleteDwelling(req, res);
});

// ACE Module - Stats API
aceRouter.get("/stats", async (req, res) => {
  await aceStatsController.getStats(req, res);
});
