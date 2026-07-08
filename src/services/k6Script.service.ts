import { GeneratedRequest } from "./requestGenerator.service";

export interface K6ScriptOptions {
  vus: number;
  duration: string;
}

/**
 * Generates a self-contained k6 script (plain JS, since k6 doesn't run TypeScript)
 * that hits every discovered route once per VU iteration, attaching the JWT
 * (if provided) as a Bearer token on every request.
 *
 * Each route also gets its own `Trend` metric (keyed by `metricName`) so the
 * report module can later break down response times per endpoint.
 */
export function generateK6Script(
  baseUrl: string,
  jwtToken: string | undefined,
  requests: GeneratedRequest[],
  options: K6ScriptOptions
): string {
  const requestsJson = JSON.stringify(requests, null, 2);
  const baseUrlJson = JSON.stringify(baseUrl);
  const tokenJson = JSON.stringify(jwtToken ?? "");
  const durationJson = JSON.stringify(options.duration);

  return `import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';

export const options = {
  vus: ${options.vus},
  duration: ${durationJson},
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

const BASE_URL = ${baseUrlJson};
const JWT_TOKEN = ${tokenJson};
const REQUESTS = ${requestsJson};

const ROUTE_TRENDS = {};
REQUESTS.forEach((req) => {
  ROUTE_TRENDS[req.metricName] = new Trend(req.metricName);
});

export default function () {
  for (const req of REQUESTS) {
    const url = BASE_URL + req.path;
    const params = {
      headers: {
        'Content-Type': 'application/json',
        ...(JWT_TOKEN ? { Authorization: 'Bearer ' + JWT_TOKEN } : {}),
      },
      tags: { name: req.method + ' ' + req.label },
    };

    const body = req.body ? JSON.stringify(req.body) : null;
    let res;

    if (req.method === 'GET') {
      res = http.get(url, params);
    } else if (req.method === 'POST') {
      res = http.post(url, body, params);
    } else if (req.method === 'PUT') {
      res = http.put(url, body, params);
    } else if (req.method === 'PATCH') {
      res = http.patch(url, body, params);
    } else if (req.method === 'DELETE') {
      res = http.del(url, null, params);
    }

    if (res) {
      ROUTE_TRENDS[req.metricName].add(res.timings.duration);

      check(res, {
        'got a response (no connection error)': (r) => r.status !== 0,
        'status is not 5xx': (r) => r.status > 0 && r.status < 500,
      });
    }
  }

  sleep(1);
}
`;
}
