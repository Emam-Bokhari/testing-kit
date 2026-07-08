import { Router } from "express";
import * as projectController from "../controllers/project.controller";

const router = Router();

router.post("/", projectController.registerProject);
router.get("/", projectController.getProjects);
router.post("/:id/discover", projectController.discoverProjectRoutes);
router.post("/:id/run", projectController.runLoadTest);

export default router;
