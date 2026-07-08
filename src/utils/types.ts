export interface Project {
  id: string;
  name: string;
  baseUrl: string;
  projectPath: string;
  entryFile: string;
  jwtToken?: string;
}

export interface DiscoveredRoute {
  method: string;
  path: string;
}

export interface RouteManifestEntry {
  metricName: string;
  method: string;
  label: string;
}
