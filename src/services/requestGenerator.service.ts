import { DiscoveredRoute } from "../utils/types";

export interface GeneratedRequest {
  method: string;
  label: string;
  path: string;
  body: Record<string, unknown> | null;
  metricName: string;
}

/**
 * Replaces Express path params (e.g. `:userId`, `:id`) with a simple dummy value
 * so the generated URL is a concrete, requestable path.
 */
function fillPathParams(routePath: string): string {
  return routePath.replace(/:([A-Za-z0-9_]+)/g, "1");
}

/**
 * Generates a simple, generic JSON body for methods that typically carry one.
 * This is intentionally NOT business-specific — just enough shape to exercise
 * the endpoint under load.
 */
function generateBody(method: string): Record<string, unknown> | null {
  if (method === "GET" || method === "DELETE") return null;

  return {
    name: "test",
    value: 1,
    active: true
  };
}

export function generateRequests(routes: DiscoveredRoute[]): GeneratedRequest[] {
  return routes.map((route, index) => ({
    method: route.method,
    label: route.path,
    path: fillPathParams(route.path),
    body: generateBody(route.method),
    metricName: `route_${index}`
  }));
}
