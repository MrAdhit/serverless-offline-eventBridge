import type { Express, Request, Response } from 'express';
import * as express from 'express';
import * as cors from 'cors';
import * as cron from 'node-cron';
import type { Server } from 'http';
import type { Lambda as LambdaType } from 'serverless-offline/lambda';
import {
  convertScheduleToNodeCron,
  isOneTimeSchedule,
  parseAtExpression,
} from './utils/schedule-converter';
import type {
  CreateScheduleInput,
  CreateScheduleOutput,
  DeleteScheduleInput,
  GetScheduleInput,
  GetScheduleOutput,
  ListSchedulesInput,
  ListSchedulesOutput,
  StoredSchedule,
} from './types/scheduler-api-interface';

export interface SchedulerServerConfig {
  port: number;
  region: string;
  accountId: string;
  debug: boolean;
}

export interface SchedulerServerDependencies {
  lambda?: LambdaType;
  logDebug: (message: string) => void;
  logNotice: (message: string) => void;
}

/**
 * Mock server for AWS EventBridge Scheduler API
 * Handles CreateSchedule, DeleteSchedule, GetSchedule, ListSchedules
 */
export class SchedulerServer {
  private app: Express;

  private server?: Server;

  private schedules: Map<string, StoredSchedule> = new Map();

  constructor(
    private config: SchedulerServerConfig,
    private deps: SchedulerServerDependencies
  ) {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json({ type: 'application/x-amz-json-1.1' }));
    this.app.use(express.json({ type: 'application/json' }));
  }

  private setupRoutes() {
    // REST API routes (used by AWS SDK v3)
    // The SDK uses /schedules/{Name} with GroupName as query param or in body

    // CreateSchedule: POST /schedules/{Name}
    this.app.post('/schedules/:scheduleName', (req: Request, res: Response) => {
      const { scheduleName } = req.params;
      const query = req.query as Record<string, string | undefined>;
      req.body.Name = scheduleName;
      // GroupName can come from query string or use default
      if (!req.body.GroupName) {
        req.body.GroupName = query['GroupName'] || 'default';
      }
      this.handleCreateSchedule(req, res);
    });

    // UpdateSchedule: PUT /schedules/{Name}
    this.app.put('/schedules/:scheduleName', (req: Request, res: Response) => {
      const { scheduleName } = req.params;
      const query = req.query as Record<string, string | undefined>;
      req.body.Name = scheduleName;
      if (!req.body.GroupName) {
        req.body.GroupName = query['GroupName'] || 'default';
      }
      this.handleUpdateSchedule(req, res);
    });

    // DeleteSchedule: DELETE /schedules/{Name}
    this.app.delete(
      '/schedules/:scheduleName',
      (req: Request, res: Response) => {
        const { scheduleName } = req.params;
        const query = req.query as Record<string, string | undefined>;
        req.body = {
          Name: scheduleName,
          GroupName: query['GroupName'] || 'default',
        };
        this.handleDeleteSchedule(req, res);
      }
    );

    // GetSchedule: GET /schedules/{Name}
    this.app.get('/schedules/:scheduleName', (req: Request, res: Response) => {
      const { scheduleName } = req.params;
      const query = req.query as Record<string, string | undefined>;
      req.body = {
        Name: scheduleName,
        GroupName: query['GroupName'] || 'default',
      };
      this.handleGetSchedule(req, res);
    });

    // ListSchedules: GET /schedules
    this.app.get('/schedules', (req: Request, res: Response) => {
      const query = req.query as Record<string, string | undefined>;
      req.body = {
        GroupName: query['GroupName'],
        State: query['State'],
        MaxResults: query['MaxResults']
          ? parseInt(query['MaxResults'], 10)
          : undefined,
      };
      this.handleListSchedules(req, res);
    });

    // Legacy: X-Amz-Target header approach (for compatibility)
    this.app.post('/', (req: Request, res: Response) => {
      const target = req.headers['x-amz-target'] as string;

      if (!target) {
        res.status(400).json({ message: 'Missing X-Amz-Target header' });
        return;
      }

      // Target format: AWSScheduler.CreateSchedule
      const action = target.split('.').pop();

      switch (action) {
        case 'CreateSchedule':
          this.handleCreateSchedule(req, res);
          break;
        case 'UpdateSchedule':
          this.handleUpdateSchedule(req, res);
          break;
        case 'DeleteSchedule':
          this.handleDeleteSchedule(req, res);
          break;
        case 'GetSchedule':
          this.handleGetSchedule(req, res);
          break;
        case 'ListSchedules':
          this.handleListSchedules(req, res);
          break;
        default:
          res.status(400).json({ message: `Unknown action: ${action}` });
      }
    });
  }

  private handleCreateSchedule(req: Request, res: Response) {
    const input: CreateScheduleInput = req.body;

    if (!input.Name || !input.ScheduleExpression || !input.Target) {
      res.status(400).json({ message: 'Missing required fields' });
      return;
    }

    const groupName = input.GroupName || 'default';
    const scheduleKey = `${groupName}/${input.Name}`;

    // Check if schedule already exists
    if (this.schedules.has(scheduleKey)) {
      res.status(409).json({
        __type: 'ConflictException',
        message: `Schedule ${input.Name} already exists`,
      });
      return;
    }

    const arn = `arn:aws:scheduler:${this.config.region}:${this.config.accountId}:schedule/${groupName}/${input.Name}`;
    const now = new Date();

    const stored: StoredSchedule = {
      name: input.Name,
      groupName,
      scheduleExpression: input.ScheduleExpression,
      timezone: input.ScheduleExpressionTimezone,
      targetArn: input.Target.Arn,
      targetRoleArn: input.Target.RoleArn,
      input: input.Target.Input,
      state: input.State || 'ENABLED',
      description: input.Description,
      arn,
      creationDate: now,
      lastModificationDate: now,
      isOneTime: isOneTimeSchedule(input.ScheduleExpression),
    };

    // Set up the schedule execution
    if (stored.state === 'ENABLED') {
      const { timeoutId, cronTask } = this.setupScheduleExecution(stored);
      stored.timeoutId = timeoutId;
      stored.cronTask = cronTask;
    }

    this.schedules.set(scheduleKey, stored);

    this.deps.logDebug(
      `Created schedule: ${input.Name} with expression ${input.ScheduleExpression}`
    );

    const output: CreateScheduleOutput = { ScheduleArn: arn };
    res.status(200).json(output);
  }

  private handleUpdateSchedule(req: Request, res: Response) {
    const input: CreateScheduleInput = req.body;

    if (!input.Name || !input.ScheduleExpression || !input.Target) {
      res.status(400).json({ message: 'Missing required fields' });
      return;
    }

    const groupName = input.GroupName || 'default';
    const scheduleKey = `${groupName}/${input.Name}`;

    const existing = this.schedules.get(scheduleKey);
    if (!existing) {
      res.status(404).json({
        __type: 'ResourceNotFoundException',
        message: `Schedule ${input.Name} not found`,
      });
      return;
    }

    // Stop existing schedule execution
    this.stopScheduleExecution(existing);

    const now = new Date();

    const stored: StoredSchedule = {
      name: input.Name,
      groupName,
      scheduleExpression: input.ScheduleExpression,
      timezone: input.ScheduleExpressionTimezone,
      targetArn: input.Target.Arn,
      targetRoleArn: input.Target.RoleArn,
      input: input.Target.Input,
      state: input.State || 'ENABLED',
      description: input.Description,
      arn: existing.arn,
      creationDate: existing.creationDate,
      lastModificationDate: now,
      isOneTime: isOneTimeSchedule(input.ScheduleExpression),
    };

    // Set up the new schedule execution
    if (stored.state === 'ENABLED') {
      const { timeoutId, cronTask } = this.setupScheduleExecution(stored);
      stored.timeoutId = timeoutId;
      stored.cronTask = cronTask;
    }

    this.schedules.set(scheduleKey, stored);

    this.deps.logDebug(
      `Updated schedule: ${input.Name} with expression ${input.ScheduleExpression}`
    );

    const output: CreateScheduleOutput = { ScheduleArn: stored.arn };
    res.status(200).json(output);
  }

  private handleDeleteSchedule(req: Request, res: Response) {
    const input: DeleteScheduleInput = req.body;

    if (!input.Name) {
      res.status(400).json({ message: 'Missing required field: Name' });
      return;
    }

    const groupName = input.GroupName || 'default';
    const scheduleKey = `${groupName}/${input.Name}`;

    const stored = this.schedules.get(scheduleKey);
    if (!stored) {
      res.status(404).json({
        __type: 'ResourceNotFoundException',
        message: `Schedule ${input.Name} not found`,
      });
      return;
    }

    // Stop the schedule
    this.stopScheduleExecution(stored);

    this.schedules.delete(scheduleKey);

    this.deps.logDebug(`Deleted schedule: ${input.Name}`);

    res.status(200).json({});
  }

  private handleGetSchedule(req: Request, res: Response) {
    const input: GetScheduleInput = req.body;

    if (!input.Name) {
      res.status(400).json({ message: 'Missing required field: Name' });
      return;
    }

    const groupName = input.GroupName || 'default';
    const scheduleKey = `${groupName}/${input.Name}`;

    const stored = this.schedules.get(scheduleKey);
    if (!stored) {
      res.status(404).json({
        __type: 'ResourceNotFoundException',
        message: `Schedule ${input.Name} not found`,
      });
      return;
    }

    const output: GetScheduleOutput = {
      Name: stored.name,
      GroupName: stored.groupName,
      ScheduleExpression: stored.scheduleExpression,
      ScheduleExpressionTimezone: stored.timezone,
      State: stored.state,
      Target: {
        Arn: stored.targetArn,
        RoleArn: stored.targetRoleArn,
        Input: stored.input,
      },
      FlexibleTimeWindow: { Mode: 'OFF' },
      Arn: stored.arn,
      CreationDate: stored.creationDate.toISOString(),
      LastModificationDate: stored.lastModificationDate.toISOString(),
    };

    res.status(200).json(output);
  }

  private handleListSchedules(req: Request, res: Response) {
    const input: ListSchedulesInput = req.body;

    const schedulesList = Array.from(this.schedules.values())
      .filter((s) => {
        if (input.GroupName && s.groupName !== input.GroupName) return false;
        if (input.State && s.state !== input.State) return false;
        return true;
      })
      .map((s) => ({
        Name: s.name,
        GroupName: s.groupName,
        Arn: s.arn,
        State: s.state,
        Target: { Arn: s.targetArn },
      }));

    const output: ListSchedulesOutput = {
      Schedules: schedulesList.slice(0, input.MaxResults || 100),
    };

    res.status(200).json(output);
  }

  private setupScheduleExecution(stored: StoredSchedule): {
    timeoutId?: ReturnType<typeof setTimeout>;
    cronTask?: cron.ScheduledTask;
  } {
    if (stored.isOneTime) {
      const executeAt = parseAtExpression(stored.scheduleExpression);
      if (executeAt) {
        const delay = executeAt.getTime() - Date.now();
        if (delay > 0) {
          const timeoutId = setTimeout(() => {
            this.invokeTarget(stored);
            // Remove one-time schedule after execution
            const scheduleKey = `${stored.groupName}/${stored.name}`;
            this.schedules.delete(scheduleKey);
          }, delay);

          this.deps.logDebug(
            `Scheduled one-time execution for ${
              stored.name
            } at ${executeAt.toISOString()}`
          );

          return { timeoutId };
        }
      }
    } else {
      const cronSchedule = convertScheduleToNodeCron(stored.scheduleExpression);
      if (cronSchedule) {
        const options: cron.ScheduleOptions = { scheduled: true };
        if (stored.timezone) {
          options.timezone = stored.timezone;
        }

        const cronTask = cron.schedule(
          cronSchedule,
          () => {
            this.invokeTarget(stored);
          },
          options
        );

        this.deps.logDebug(
          `Scheduled recurring execution for ${stored.name} with cron ${cronSchedule}`
        );

        return { cronTask };
      }
    }
    return {};
  }

  private stopScheduleExecution(stored: StoredSchedule) {
    if (stored.cronTask) {
      stored.cronTask.stop();
      this.deps.logDebug(`Stopped cron task for schedule: ${stored.name}`);
    }
    if (stored.timeoutId) {
      clearTimeout(stored.timeoutId);
      this.deps.logDebug(`Cleared timeout for schedule: ${stored.name}`);
    }
  }

  private invokeTarget(stored: StoredSchedule) {
    this.deps.logDebug(`Invoking target for schedule: ${stored.name}`);

    // Extract function name from ARN
    // Format: arn:aws:lambda:region:account:function:functionName
    const arnParts = stored.targetArn.split(':');
    const functionName = arnParts[arnParts.length - 1];

    if (!this.deps.lambda) {
      this.deps.logDebug('Lambda not available, cannot invoke target');
      return;
    }

    try {
      const lambdaFunction = this.deps.lambda.get(functionName);
      if (!lambdaFunction) {
        this.deps.logDebug(`Lambda function ${functionName} not found`);
        return;
      }

      // Create scheduler event payload
      const event = {
        version: '0',
        id: `xxxxxxxx-xxxx-xxxx-xxxx-${Date.now()}`,
        'detail-type': 'Scheduled Event',
        source: 'aws.scheduler',
        account: this.config.accountId,
        time: new Date().toISOString(),
        region: this.config.region,
        resources: [stored.arn],
        detail: stored.input ? JSON.parse(stored.input) : {},
      };

      lambdaFunction.setEvent(event);
      lambdaFunction.runHandler();

      this.deps.logDebug(`Invoked ${functionName} for schedule ${stored.name}`);
    } catch (err) {
      this.deps.logDebug(
        `Error invoking target: ${(err as Error).message || err}`
      );
    }
  }

  start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.config.port, () => {
        this.deps.logNotice(
          `Scheduler mock server running at port: ${this.config.port}`
        );
        resolve();
      });
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      // Stop all schedules
      this.schedules.forEach((stored) => {
        this.stopScheduleExecution(stored);
      });
      this.schedules.clear();

      if (this.server) {
        this.server.close(() => resolve());
      } else {
        resolve();
      }
    });
  }

  /** Update the lambda reference (called after lambdas are created) */
  setLambda(lambda: LambdaType) {
    this.deps.lambda = lambda;
  }
}
