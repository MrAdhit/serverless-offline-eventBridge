import {
  convertScheduleToNodeCron,
  isOneTimeSchedule,
  parseAtExpression,
} from './schedule-converter';
import type {
  SchedulerEvent,
  ParsedSchedulerEvent,
} from '../types/scheduler-event-interface';

/**
 * Check if a scheduler event is enabled
 */
export function isSchedulerEnabled(event: SchedulerEvent | string): boolean {
  if (typeof event === 'string') {
    return true;
  }
  return event.enabled !== false;
}

/**
 * Normalize scheduler config to SchedulerEvent object
 * Handles both string shorthand and object config
 */
export function normalizeSchedulerConfig(
  config: SchedulerEvent | string
): SchedulerEvent {
  if (typeof config === 'string') {
    return { schedule: config };
  }
  return config;
}

/**
 * Parse a scheduler event configuration from serverless.yml
 * @param schedulerConfig - The scheduler configuration (string or object)
 * @param functionKey - The function key to invoke
 * @returns ParsedSchedulerEvent or null if invalid/disabled
 */
export function parseSchedulerEvent(
  schedulerConfig: SchedulerEvent | string,
  functionKey: string
): ParsedSchedulerEvent | null {
  // Normalize to object form
  const event = normalizeSchedulerConfig(schedulerConfig);

  // Check if enabled
  if (!isSchedulerEnabled(event)) {
    return null;
  }

  const { schedule } = event;
  if (!schedule) {
    return null;
  }

  // Handle one-time at() schedules
  if (isOneTimeSchedule(schedule)) {
    const executeAt = parseAtExpression(schedule);
    if (!executeAt) {
      return null;
    }

    return {
      schedule,
      event,
      functionKey,
      timezone: event.timezone,
      isOneTime: true,
      executeAt,
    };
  }

  // Handle recurring cron/rate schedules
  const convertedSchedule = convertScheduleToNodeCron(schedule);
  if (!convertedSchedule) {
    return null;
  }

  return {
    schedule: convertedSchedule,
    event,
    functionKey,
    timezone: event.timezone,
    isOneTime: false,
  };
}
