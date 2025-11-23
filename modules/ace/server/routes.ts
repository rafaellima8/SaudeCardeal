import { Router } from "express";
import { aceSyncController } from "./controllers/sync.controller";
import { dwellingController } from "./controllers/dwelling.controller";
import { visitController } from "./controllers/visit.controller";
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

// ACE Module - Visits API
aceRouter.get("/visits", async (req, res) => {
  await visitController.listVisits(req, res);
});

aceRouter.get("/visits/:id", async (req, res) => {
  await visitController.getVisitById(req, res);
});

aceRouter.post("/visits", async (req, res) => {
  await visitController.createVisit(req, res);
});

aceRouter.patch("/visits/:id", async (req, res) => {
  await visitController.updateVisit(req, res);
});

aceRouter.delete("/visits/:id", async (req, res) => {
  await visitController.deleteVisit(req, res);
});

// ACE Module - Stats API
aceRouter.get("/stats", async (req, res) => {
  await aceStatsController.getStats(req, res);
});
