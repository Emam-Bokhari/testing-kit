import fs from "fs";
import path from "path";
import { AppError } from "../utils/errors";
import { RouteManifestEntry } from "../utils/types";

const REPORTS_DIR = path.join(__dirname, "..", "..", "reports");

function ensureDirs(): void {
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }
}

interface TrendStats {
  avg?: number;
  min?: number;
  med?: number;
  max?: number;
  "p(90)"?: number;
  "p(95)"?: number;
  "p(99)"?: number;
}

interface RawSummary {
  metrics: Record<string, Record<string, number>>;
  root_group?: {
    checks?: Record<
      string,
      {
        passes: number;
        fails: number;
        name: string;
      }
    >;
  };
}

export interface EndpointStat {
  method: string;
  path: string;
  avgResponseTimeMs: number;
}

export interface Report {
  projectId: string;
  totalRequests: number;
  avgResponseTimeMs: number;
  p95ResponseTimeMs: number;
  p99ResponseTimeMs: number;
  requestsPerSecond: number;
  successRate: number;
  failureRate: number;
  slowestEndpoints: EndpointStat[];
  fastestEndpoints: EndpointStat[];
  allEndpoints: EndpointStat[];
  generatedAt: string;
}

function round(value: number | undefined, decimals = 2): number {
  if (value === undefined || Number.isNaN(value)) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

export function getRawSummaryPath(projectId: string): string {
  return path.join(REPORTS_DIR, `${projectId}-raw-summary.json`);
}

export function getRouteManifestPath(projectId: string): string {
  return path.join(REPORTS_DIR, `${projectId}-route-manifest.json`);
}

export function getReportJsonPath(projectId: string): string {
  return path.join(REPORTS_DIR, `${projectId}-summary.json`);
}

export function getReportHtmlPath(projectId: string): string {
  return path.join(REPORTS_DIR, `${projectId}-summary.html`);
}

function readJsonFile<T>(filePath: string): T {
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as T;
}

function buildEndpointStats(rawSummary: RawSummary, manifest: RouteManifestEntry[]): EndpointStat[] {
  const stats: EndpointStat[] = [];

  for (const entry of manifest) {
    const trend = rawSummary.metrics[entry.metricName] as TrendStats | undefined;
    if (!trend || trend.avg === undefined) continue;

    stats.push({
      method: entry.method,
      path: entry.label,
      avgResponseTimeMs: round(trend.avg)
    });
  }

  return stats;
}

function computeSuccessAndFailure(rawSummary: RawSummary): { successRate: number; failureRate: number } {
  const checks = rawSummary.root_group?.checks ?? {};

  let passes = 0;
  let fails = 0;

  for (const key of Object.keys(checks)) {
    passes += checks[key].passes ?? 0;
    fails += checks[key].fails ?? 0;
  }

  const total = passes + fails;
  if (total === 0) return { successRate: 0, failureRate: 0 };

  const successRate = (passes / total) * 100;
  return { successRate: round(successRate), failureRate: round(100 - successRate) };
}

function renderHtml(report: Report): string {
  const rows = (list: EndpointStat[]): string =>
    list
      .map(
        (e) =>
          `<tr><td>${e.method}</td><td>${e.path}</td><td>${e.avgResponseTimeMs} ms</td></tr>`
      )
      .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Performance Report - ${report.projectId}</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; background: #0f172a; color: #e2e8f0; margin: 0; padding: 32px; }
  h1 { font-size: 22px; margin-bottom: 4px; }
  .subtitle { color: #94a3b8; margin-bottom: 24px; font-size: 13px; }
  .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 32px; }
  .card { background: #1e293b; border-radius: 8px; padding: 16px; }
  .card .label { color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
  .card .value { font-size: 24px; font-weight: 700; margin-top: 4px; }
  .success { color: #4ade80; }
  .failure { color: #f87171; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 32px; }
  th, td { text-align: left; padding: 8px 12px; border-bottom: 1px solid #334155; font-size: 13px; }
  th { color: #94a3b8; font-weight: 600; }
  h2 { font-size: 16px; margin-top: 32px; }
</style>
</head>
<body>
  <h1>Performance Test Report</h1>
  <div class="subtitle">Project: ${report.projectId} &middot; Generated: ${report.generatedAt}</div>

  <div class="grid">
    <div class="card"><div class="label">Total Requests</div><div class="value">${report.totalRequests}</div></div>
    <div class="card"><div class="label">Requests / sec</div><div class="value">${report.requestsPerSecond}</div></div>
    <div class="card"><div class="label">Avg Response Time</div><div class="value">${report.avgResponseTimeMs} ms</div></div>
    <div class="card"><div class="label">P95</div><div class="value">${report.p95ResponseTimeMs} ms</div></div>
    <div class="card"><div class="label">P99</div><div class="value">${report.p99ResponseTimeMs} ms</div></div>
    <div class="card"><div class="label">Success Rate</div><div class="value success">${report.successRate}%</div></div>
    <div class="card"><div class="label">Failure Rate</div><div class="value failure">${report.failureRate}%</div></div>
  </div>

  <h2>Slowest Endpoints</h2>
  <table>
    <thead><tr><th>Method</th><th>Path</th><th>Avg Response Time</th></tr></thead>
    <tbody>${rows(report.slowestEndpoints)}</tbody>
  </table>

  <h2>Fastest Endpoints</h2>
  <table>
    <thead><tr><th>Method</th><th>Path</th><th>Avg Response Time</th></tr></thead>
    <tbody>${rows(report.fastestEndpoints)}</tbody>
  </table>

  <h2>All Endpoints (${report.allEndpoints.length})</h2>
  <table>
    <thead><tr><th>Method</th><th>Path</th><th>Avg Response Time</th></tr></thead>
    <tbody>${rows(report.allEndpoints)}</tbody>
  </table>
</body>
</html>
`;
}

export function generateReport(projectId: string): Report {
  const rawSummaryPath = getRawSummaryPath(projectId);
  const manifestPath = getRouteManifestPath(projectId);

  if (!fs.existsSync(rawSummaryPath) || !fs.existsSync(manifestPath)) {
    throw new AppError(
      `No load test results found for project ${projectId}. Run POST /projects/:id/run first.`,
      404
    );
  }

  const rawSummary = readJsonFile<RawSummary>(rawSummaryPath);
  const manifest = readJsonFile<RouteManifestEntry[]>(manifestPath);

  const httpReqs = rawSummary.metrics["http_reqs"] ?? {};
  const httpReqDuration = (rawSummary.metrics["http_req_duration"] ?? {}) as TrendStats;
  const { successRate, failureRate } = computeSuccessAndFailure(rawSummary);

  const endpointStats = buildEndpointStats(rawSummary, manifest);
  const sortedByAvg = [...endpointStats].sort((a, b) => b.avgResponseTimeMs - a.avgResponseTimeMs);
  const sortedByPath = [...endpointStats].sort((a, b) => a.path.localeCompare(b.path));

  const report: Report = {
    projectId,
    totalRequests: httpReqs.count ?? 0,
    avgResponseTimeMs: round(httpReqDuration.avg),
    p95ResponseTimeMs: round(httpReqDuration["p(95)"]),
    p99ResponseTimeMs: round(httpReqDuration["p(99)"]),
    requestsPerSecond: round(httpReqs.rate),
    successRate,
    failureRate,
    slowestEndpoints: sortedByAvg.slice(0, 5),
    fastestEndpoints: sortedByAvg.slice(-5).reverse(),
    allEndpoints: sortedByPath,
    generatedAt: new Date().toISOString()
  };

  ensureDirs();
  fs.writeFileSync(getReportJsonPath(projectId), JSON.stringify(report, null, 2), "utf-8");
  fs.writeFileSync(getReportHtmlPath(projectId), renderHtml(report), "utf-8");

  return report;
}

export function getStoredReport(projectId: string): { json: Report; html: string } {
  const jsonPath = getReportJsonPath(projectId);
  const htmlPath = getReportHtmlPath(projectId);

  if (!fs.existsSync(jsonPath) || !fs.existsSync(htmlPath)) {
    throw new AppError(
      `No report found for project ${projectId}. Run POST /projects/:id/run first.`,
      404
    );
  }

  return {
    json: readJsonFile<Report>(jsonPath),
    html: fs.readFileSync(htmlPath, "utf-8")
  };
}
