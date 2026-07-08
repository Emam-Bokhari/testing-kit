import { Request, Response, NextFunction } from "express";
import * as projectService from "../services/project.service";
import * as discoveryService from "../services/discovery.service";
import * as routeStorageService from "../services/routeStorage.service";
import * as requestGeneratorService from "../services/requestGenerator.service";
import * as k6ScriptService from "../services/k6Script.service";
import * as runnerService from "../services/runner.service";
import * as reportService from "../services/report.service";
import { AppError } from "../utils/errors";

export function registerProject(req: Request, res: Response, next: NextFunction): void {
  try {
    const { name, baseUrl, projectPath, entryFile, jwtToken } = req.body;
    const project = projectService.createProject({
      name,
      baseUrl,
      projectPath,
      entryFile,
      jwtToken
    });
    res.status(201).json(project);
  } catch (err) {
    next(err);
  }
}

export function getProjects(_req: Request, res: Response, next: NextFunction): void {
  try {
    const projects = projectService.listProjects();
    res.status(200).json(projects);
  } catch (err) {
    next(err);
  }
}

export function discoverProjectRoutes(req: Request, res: Response, next: NextFunction): void {
  try {
    const project = projectService.getProjectById(req.params.id);
    const routes = discoveryService.discoverRoutes(project);
    routeStorageService.saveRoutesForProject(project.id, routes);

    res.status(200).json({
      projectId: project.id,
      count: routes.length,
      routes
    });
  } catch (err) {
    next(err);
  }
}

export async function runLoadTest(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const project = projectService.getProjectById(req.params.id);
    const routes = routeStorageService.getRoutesForProject(project.id);

    if (routes.length === 0) {
      throw new AppError(
        "No discovered routes found for this project. Run POST /projects/:id/discover first.",
        400
      );
    }

    const vus = req.body?.vus ?? 5;
    const duration = req.body?.duration ?? "10s";

    if (typeof vus !== "number" || vus <= 0) {
      throw new AppError("Invalid configuration: vus must be a positive number", 400);
    }
    if (typeof duration !== "string" || duration.trim() === "") {
      throw new AppError("Invalid configuration: duration must be a non-empty string (e.g. '10s')", 400);
    }

    const requests = requestGeneratorService.generateRequests(routes);
    const script = k6ScriptService.generateK6Script(project.baseUrl, project.jwtToken, requests, {
      vus,
      duration
    });

    const scriptPath = runnerService.writeK6Script(project.id, script);
    const summaryExportPath = runnerService.getRawSummaryPath(project.id);

    runnerService.writeRouteManifest(
      project.id,
      requests.map((r) => ({ metricName: r.metricName, method: r.method, label: r.label }))
    );

    await runnerService.runK6(scriptPath, summaryExportPath);

    const report = reportService.generateReport(project.id);

    res.status(200).json({
      projectId: project.id,
      message: "Load test completed",
      requestCount: requests.length,
      vus,
      duration,
      scriptPath,
      report
    });
  } catch (err) {
    next(err);
  }
}
