import type { Input } from 'serverless/plugins/aws/provider/awsProvider';

/**
 * EventBridge Scheduler event configuration from serverless.yml
 * @see https://www.serverless.com/framework/docs/providers/aws/events/schedule
 */
export interface SchedulerEvent {
  /** Schedule name */
  name?: string;
  /** Schedule description */
  description?: string;
  /**
   * Schedule expression (rate, cron, or at format).
   * @example 'rate(5 minutes)' | 'cron(0 12 * * ? *)' | 'at(2024-01-15T10:00:00)'
   */
  schedule: string;
  /**
   * IANA timezone for the schedule (e.g., 'America/New_York', 'Europe/London').
   * If not specified, defaults to UTC.
   */
  timezone?: string;
  /**
   * Whether the schedule is enabled.
   * @default true
   */
  enabled?: boolean;
  /** Static input to pass to Lambda */
  input?: Input;
}

/**
 * Parsed scheduler event ready for execution
 */
export interface ParsedSchedulerEvent {
  /** Converted node-cron schedule expression (for recurring) or original at() expression */
  schedule: string;
  /** Original scheduler event configuration */
  event: SchedulerEvent;
  /** Function key to invoke */
  functionKey: string;
  /** Optional timezone for recurring schedules */
  timezone?: string;
  /** True for one-time at() schedules */
  isOneTime: boolean;
  /** Execution timestamp for one-time schedules */
  executeAt?: Date;
}
