// Build info - overwritten by GitHub Actions during deployment
// This file contains defaults for local development
export const BUILD_INFO = {
  version: '1.0.0',
  fullVersion: '1.0.0+local',
  buildNumber: 0,
  commitSha: 'local',
  deployTime: new Date().toISOString(),
  deployTimeHuman: 'Local Development',
  branch: 'local',
} as const;
