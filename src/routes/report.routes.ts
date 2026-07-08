import { Router } from "express";
import * as reportController from "../controllers/report.controller";

const router = Router();

router.get("/:id", reportController.getReport);

export default router;
