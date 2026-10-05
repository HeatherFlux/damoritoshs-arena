/**
 * Every import accepts YAML as well as JSON. The store importers all take a JSON string, so
 * YAML is read here and handed on as JSON. JSON is tried first so exported files load exactly
 * as they always have.
 */

import yaml from 'js-yaml'

/** File types the import pickers offer. */
export const IMPORT_ACCEPT = '.yaml,.yml,.json'

export function toJsonText(content: string): string {
  try {
    JSON.parse(content)
    return content
  } catch {
    // Not JSON; read it as YAML.
  }
  const data = yaml.load(content)
  if (data === undefined || data === null) throw new Error('The file is empty')
  return JSON.stringify(data)
}
