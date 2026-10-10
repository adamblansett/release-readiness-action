import type { ReadinessReport } from '../types/index.js';

export function formatJsonReport(report: ReadinessReport, space = 2): string {
  return JSON.stringify(report, null, space);
}
