import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { Project } from "../utils/types";
import { AppError } from "../utils/errors";

const STORAGE_DIR = path.join(__dirname, "..", "..", "storage");
const PROJECTS_FILE = path.join(STORAGE_DIR, "projects.json");

function ensureStorageFile(): void {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
  if (!fs.existsSync(PROJECTS_FILE)) {
    fs.writeFileSync(PROJECTS_FILE, "[]", "utf-8");
  }
}

function readProjects(): Project[] {
  ensureStorageFile();
  const raw = fs.readFileSync(PROJECTS_FILE, "utf-8");
  try {
    return JSON.parse(raw) as Project[];
  } catch {
    throw new AppError("Failed to parse projects.json", 500);
  }
}

function writeProjects(projects: Project[]): void {
  ensureStorageFile();
  fs.writeFileSync(PROJECTS_FILE, JSON.stringify(projects, null, 2), "utf-8");
}

export function createProject(input: {
  name: string;
  baseUrl: string;
  projectPath: string;
  entryFile: string;
  jwtToken?: string;
}): Project {
  if (!input.name || !input.baseUrl || !input.projectPath || !input.entryFile) {
    throw new AppError(
      "Invalid configuration: name, baseUrl, projectPath and entryFile are required",
      400
    );
  }

  const fullEntryPath = path.join(input.projectPath, input.entryFile);
  if (!fs.existsSync(fullEntryPath)) {
    throw new AppError(`Entry file not found: ${fullEntryPath}`, 400);
  }

  const projects = readProjects();

  const newProject: Project = {
    id: uuidv4(),
    name: input.name,
    baseUrl: input.baseUrl,
    projectPath: input.projectPath,
    entryFile: input.entryFile,
    jwtToken: input.jwtToken
  };

  projects.push(newProject);
  writeProjects(projects);

  return newProject;
}

export function listProjects(): Project[] {
  return readProjects();
}

export function getProjectById(id: string): Project {
  const projects = readProjects();
  const project = projects.find((p) => p.id === id);
  if (!project) {
    throw new AppError(`Project not found: ${id}`, 404);
  }
  return project;
}
