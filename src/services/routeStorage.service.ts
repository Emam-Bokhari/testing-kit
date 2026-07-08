import fs from "fs";
import path from "path";
import { DiscoveredRoute } from "../utils/types";

const STORAGE_DIR = path.join(__dirname, "..", "..", "storage");
const ROUTES_FILE = path.join(STORAGE_DIR, "routes.json");

type RoutesByProject = Record<string, DiscoveredRoute[]>;

function ensureStorageFile(): void {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
  if (!fs.existsSync(ROUTES_FILE)) {
    fs.writeFileSync(ROUTES_FILE, "{}", "utf-8");
  }
}

function readAllRoutes(): RoutesByProject {
  ensureStorageFile();
  const raw = fs.readFileSync(ROUTES_FILE, "utf-8");
  return JSON.parse(raw) as RoutesByProject;
}

function writeAllRoutes(data: RoutesByProject): void {
  ensureStorageFile();
  fs.writeFileSync(ROUTES_FILE, JSON.stringify(data, null, 2), "utf-8");
}

export function saveRoutesForProject(projectId: string, routes: DiscoveredRoute[]): void {
  const all = readAllRoutes();
  all[projectId] = routes;
  writeAllRoutes(all);
}

export function getRoutesForProject(projectId: string): DiscoveredRoute[] {
  const all = readAllRoutes();
  return all[projectId] ?? [];
}
