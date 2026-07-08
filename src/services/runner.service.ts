import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { AppError } from "../utils/errors";

const GENERATED_DIR = path.join(__dirname, "..", "..", "generated");
const REPORTS_DIR = path.join(__dirname, "..", "..", "reports");

function ensureDirs(): void {
  if (!fs.existsSync(GENERATED_DIR)) fs.mkdirSync(GENERATED_DIR, { recursive: true });
  if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

export function getGeneratedScriptPath(projectId: string): string {
  return path.join(GENERATED_DIR, `${projectId}.js`);
}

export function getRawSummaryPath(projectId: string): string {
  return path.join(REPORTS_DIR, `${projectId}-raw-summary.json`);
}

export function getRouteManifestPath(projectId: string): string {
  return path.join(REPORTS_DIR, `${projectId}-route-manifest.json`);
}

export function writeRouteManifest(projectId: string, manifest: unknown): void {
  ensureDirs();
  fs.writeFileSync(getRouteManifestPath(projectId), JSON.stringify(manifest, null, 2), "utf-8");
}

export function writeK6Script(projectId: string, scriptContent: string): string {
  ensureDirs();
  const scriptPath = getGeneratedScriptPath(projectId);
  fs.writeFileSync(scriptPath, scriptContent, "utf-8");
  return scriptPath;
}

/**
 * Runs `k6 run --summary-export=<summaryPath> <scriptPath>` and resolves once
 * the process exits successfully. k6 writes the raw metrics summary as JSON
 * to `summaryPath`, which the (future) report module will read and format.
 */
export function runK6(scriptPath: string, summaryExportPath: string): Promise<{ stdout: string; stderr: string }> {
  ensureDirs();

  return new Promise((resolve, reject) => {
    const child = spawn("k6", ["run", `--summary-export=${summaryExportPath}`, scriptPath]);

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "ENOENT") {
        reject(new AppError("k6 not installed: could not find the 'k6' command in PATH.", 500));
      } else {
        reject(new AppError(`Failed to start k6: ${err.message}`, 500));
      }
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new AppError(`k6 run exited with code ${code}: ${stderr || stdout}`, 500));
      }
    });
  });
}
