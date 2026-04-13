/**
 * Convert AWS rate expression to node-cron format
 * Examples: rate(5 minutes), rate(1 hour), rate(1 day)
 */
export function convertRateExpression(schedule: string): string | null {
  const rate = schedule.replace('rate(', '').replace(')', '');
  const parts = rate.split(' ');

  if (!parts[1]) {
    return null;
  }

  const value = parts[0];
  const unit = parts[1];

  if (unit.startsWith('minute')) {
    return `*/${value} * * * *`;
  }

  if (unit.startsWith('hour')) {
    return `0 */${value} * * *`;
  }

  if (unit.startsWith('day')) {
    return `0 0 */${value} * *`;
  }

  return null;
}

/**
 * Convert AWS cron expression to node-cron format
 * AWS: cron(min hour dayOfMonth month dayOfWeek year)
 * node-cron: min hour dayOfMonth month dayOfWeek (no year, no seconds)
 *
 * The ? character in AWS cron (meaning "no specific value") is converted to *
 * The 0/x pattern is converted to *\/x
 */
export function convertCronExpression(schedule: string): string | null {
  if (!schedule.startsWith('cron(') || !schedule.endsWith(')')) {
    return null;
  }

  // Extract cron expression: remove "cron(" prefix and ")" suffix, and the year field
  // AWS format: cron(min hour dayOfMonth month dayOfWeek year)
  // We need: min hour dayOfMonth month dayOfWeek
  let convertedSchedule = schedule.substring(5, schedule.length - 3);

  // Replace ? by * for node-cron (? means "no specific value" in AWS)
  convertedSchedule = convertedSchedule.split('?').join('*');

  // Replace 0/x by */x for node-cron
  convertedSchedule = convertedSchedule.replaceAll(/0\//gi, '*/');

  return convertedSchedule;
}

/**
 * Convert AWS EventBridge schedule expression to node-cron format
 * AWS format: cron(0 5 * * ? *) or rate(5 minutes)
 * node-cron format: sec min hour dayOfMonth month dayOfWeek (sec is optional)
 */
export function convertScheduleToNodeCron(schedule: string): string | null {
  if (schedule.indexOf('rate') > -1) {
    return convertRateExpression(schedule);
  }

  return convertCronExpression(schedule);
}

/**
 * Check if the schedule is a one-time at() expression
 * @example at(2024-01-15T10:00:00)
 */
export function isOneTimeSchedule(schedule: string): boolean {
  return schedule.startsWith('at(');
}

/**
 * Parse an at() expression and return the execution Date
 * @param schedule - Format: at(yyyy-mm-ddThh:mm:ss)
 * @returns Date object or null if invalid
 */
export function parseAtExpression(schedule: string): Date | null {
  // Format: at(yyyy-mm-ddThh:mm:ss) or at(yyyy-mm-ddThh:mm:ss) with optional timezone
  const match = schedule.match(/^at\((\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})\)$/);
  if (!match) return null;

  const date = new Date(match[1]);
  // Check if the date is valid
  if (Number.isNaN(date.getTime())) return null;

  return date;
}
