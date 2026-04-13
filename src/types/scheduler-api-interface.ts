import type { ScheduledTask } from 'node-cron';

/**
 * CreateSchedule API input
 * @see https://docs.aws.amazon.com/scheduler/latest/APIReference/API_CreateSchedule.html
 */
export interface CreateScheduleInput {
  /** Schedule name (required) */
  Name: string;
  /** Schedule group name */
  GroupName?: string;
  /** Schedule expression: rate(), cron(), or at() */
  ScheduleExpression: string;
  /** IANA timezone for the schedule */
  ScheduleExpressionTimezone?: string;
  /** Flexible time window configuration */
  FlexibleTimeWindow: {
    Mode: 'OFF' | 'FLEXIBLE';
    MaximumWindowInMinutes?: number;
  };
  /** Target to invoke when schedule fires */
  Target: {
    /** Target ARN (Lambda function, SQS, SNS, etc.) */
    Arn: string;
    /** Role ARN for the scheduler to assume */
    RoleArn: string;
    /** Input to pass to the target */
    Input?: string;
  };
  /** Schedule state */
  State?: 'ENABLED' | 'DISABLED';
  /** Description */
  Description?: string;
  /** Start date for the schedule */
  StartDate?: string;
  /** End date for the schedule */
  EndDate?: string;
}

/**
 * CreateSchedule API output
 */
export interface CreateScheduleOutput {
  ScheduleArn: string;
}

/**
 * GetSchedule API input
 */
export interface GetScheduleInput {
  Name: string;
  GroupName?: string;
}

/**
 * GetSchedule API output
 */
export interface GetScheduleOutput {
  Name: string;
  GroupName: string;
  ScheduleExpression: string;
  ScheduleExpressionTimezone?: string;
  State: 'ENABLED' | 'DISABLED';
  Target: {
    Arn: string;
    RoleArn: string;
    Input?: string;
  };
  FlexibleTimeWindow: {
    Mode: 'OFF' | 'FLEXIBLE';
    MaximumWindowInMinutes?: number;
  };
  Arn: string;
  CreationDate: string;
  LastModificationDate: string;
}

/**
 * DeleteSchedule API input
 */
export interface DeleteScheduleInput {
  Name: string;
  GroupName?: string;
}

/**
 * ListSchedules API input
 */
export interface ListSchedulesInput {
  GroupName?: string;
  MaxResults?: number;
  NextToken?: string;
  State?: 'ENABLED' | 'DISABLED';
}

/**
 * ListSchedules API output
 */
export interface ListSchedulesOutput {
  Schedules: Array<{
    Name: string;
    GroupName: string;
    Arn: string;
    State: 'ENABLED' | 'DISABLED';
    Target: {
      Arn: string;
    };
  }>;
  NextToken?: string;
}

/**
 * Internal schedule configuration stored in memory
 */
export interface StoredSchedule {
  name: string;
  groupName: string;
  scheduleExpression: string;
  timezone?: string;
  targetArn: string;
  targetRoleArn: string;
  input?: string;
  state: 'ENABLED' | 'DISABLED';
  description?: string;
  arn: string;
  creationDate: Date;
  lastModificationDate: Date;
  /** node-cron task for recurring schedules */
  cronTask?: ScheduledTask;
  /** setTimeout ID for one-time schedules */
  timeoutId?: ReturnType<typeof setTimeout>;
  /** True for at() schedules */
  isOneTime: boolean;
}
