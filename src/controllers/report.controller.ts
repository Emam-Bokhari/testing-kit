import { Request, Response, NextFunction } from "express";
import * as reportService from "../services/report.service";

export function getReport(req: Request, res: Response, next: NextFunction): void {
  try {
    const { html } = reportService.getStoredReport(req.params.id);
    res.status(200).setHeader("Content-Type", "text/html").send(html);
  } catch (err) {
    next(err);
  }
}
