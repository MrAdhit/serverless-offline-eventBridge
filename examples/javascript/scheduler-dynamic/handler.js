/**
 * Example: Creating recurring schedules dynamically via the Scheduler API
 *
 * Usage:
 * 1. Start serverless offline: npm start
 * 2. Create a recurring schedule:
 *    curl -X POST http://localhost:3000/dev/create-schedule \
 *      -H "Content-Type: application/json" \
 *      -d '{"name": "my-schedule", "schedule": "rate(1 minute)"}'
 * 3. Watch the target function get invoked repeatedly
 * 4. Delete the schedule:
 *    curl -X POST http://localhost:3000/dev/delete-schedule \
 *      -H "Content-Type: application/json" \
 *      -d '{"name": "my-schedule"}'
 */

import {
  SchedulerClient,
  CreateScheduleCommand,
  DeleteScheduleCommand,
  ListSchedulesCommand,
} from '@aws-sdk/client-scheduler';

const getClient = () =>
  new SchedulerClient({
    endpoint: 'http://127.0.0.1:4012',
    region: 'us-east-1',
    credentials: {
      accessKeyId: 'test',
      secretAccessKey: 'test',
    },
  });

export const createSchedule = async (event) => {
  const client = getClient();
  const body = JSON.parse(event.body || '{}');

  const name = body.name || `schedule-${Date.now()}`;
  const schedule = body.schedule || 'rate(1 minute)';
  const timezone = body.timezone;

  try {
    const command = new CreateScheduleCommand({
      Name: name,
      ScheduleExpression: schedule,
      ScheduleExpressionTimezone: timezone,
      FlexibleTimeWindow: { Mode: 'OFF' },
      Target: {
        Arn: 'arn:aws:lambda:us-east-1:000000000000:function:targetFunction',
        RoleArn: 'arn:aws:iam::000000000000:role/scheduler-role',
        Input: JSON.stringify({
          scheduleName: name,
          createdBy: 'dynamic-example',
          message: body.message || 'Hello from dynamic scheduler!',
        }),
      },
    });

    const result = await client.send(command);

    console.log(`Created recurring schedule: ${name}`);
    console.log(`Schedule expression: ${schedule}`);
    console.log(`Schedule ARN: ${result.ScheduleArn}`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Schedule created successfully',
        name,
        schedule,
        timezone: timezone || 'UTC',
        scheduleArn: result.ScheduleArn,
      }),
    };
  } catch (error) {
    console.error('Error creating schedule:', error);
    return {
      statusCode: error.name === 'ConflictException' ? 409 : 500,
      body: JSON.stringify({
        error: error.message,
      }),
    };
  }
};

export const deleteSchedule = async (event) => {
  const client = getClient();
  const body = JSON.parse(event.body || '{}');

  if (!body.name) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing required field: name' }),
    };
  }

  try {
    const command = new DeleteScheduleCommand({
      Name: body.name,
    });

    await client.send(command);

    console.log(`Deleted schedule: ${body.name}`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Schedule deleted successfully',
        name: body.name,
      }),
    };
  } catch (error) {
    console.error('Error deleting schedule:', error);
    return {
      statusCode: error.name === 'ResourceNotFoundException' ? 404 : 500,
      body: JSON.stringify({
        error: error.message,
      }),
    };
  }
};

export const listSchedules = async () => {
  const client = getClient();

  try {
    const command = new ListSchedulesCommand({});
    const result = await client.send(command);

    return {
      statusCode: 200,
      body: JSON.stringify({
        schedules: result.Schedules,
        count: result.Schedules?.length || 0,
      }),
    };
  } catch (error) {
    console.error('Error listing schedules:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message,
      }),
    };
  }
};

export const target = async (event) => {
  console.log('========================================');
  console.log('Dynamic schedule executed!');
  console.log('Time:', new Date().toISOString());
  console.log('Event:', JSON.stringify(event, null, 2));
  console.log('========================================');

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Dynamic schedule executed successfully',
      timestamp: new Date().toISOString(),
      detail: event.detail,
    }),
  };
};
