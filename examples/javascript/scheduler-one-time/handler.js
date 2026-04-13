/**
 * Example: Creating one-time schedules dynamically via the Scheduler API
 *
 * Usage:
 * 1. Start serverless offline: npm start
 * 2. Create a one-time schedule:
 *    curl -X POST http://localhost:3000/dev/schedule-once \
 *      -H "Content-Type: application/json" \
 *      -d '{"name": "my-reminder", "delaySeconds": 30}'
 * 3. Wait for the target function to be invoked
 */

import {
  SchedulerClient,
  CreateScheduleCommand,
} from '@aws-sdk/client-scheduler';

export const createOneTime = async (event) => {
  const client = new SchedulerClient({
    endpoint: 'http://127.0.0.1:4012',
    region: 'us-east-1',
    credentials: {
      accessKeyId: 'test',
      secretAccessKey: 'test',
    },
  });

  const body = JSON.parse(event.body || '{}');
  const delaySeconds = body.delaySeconds || 30;
  const name = body.name || `one-time-${Date.now()}`;

  // Calculate the execution time
  const runAt = new Date(Date.now() + delaySeconds * 1000);
  // Format: at(yyyy-mm-ddThh:mm:ss)
  const atExpression = `at(${runAt.toISOString().split('.')[0]})`;

  try {
    const command = new CreateScheduleCommand({
      Name: name,
      ScheduleExpression: atExpression,
      FlexibleTimeWindow: { Mode: 'OFF' },
      Target: {
        Arn: 'arn:aws:lambda:us-east-1:000000000000:function:targetFunction',
        RoleArn: 'arn:aws:iam::000000000000:role/scheduler-role',
        Input: JSON.stringify({
          scheduledAt: runAt.toISOString(),
          createdBy: 'one-time-example',
          message: body.message || 'Hello from one-time scheduler!',
        }),
      },
    });

    const result = await client.send(command);

    console.log(`Created one-time schedule: ${name}`);
    console.log(`Will execute at: ${runAt.toISOString()}`);
    console.log(`Schedule ARN: ${result.ScheduleArn}`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: `Schedule created successfully`,
        name,
        executeAt: runAt.toISOString(),
        expression: atExpression,
        scheduleArn: result.ScheduleArn,
      }),
    };
  } catch (error) {
    console.error('Error creating schedule:', error);
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
  console.log('One-time schedule executed!');
  console.log('Time:', new Date().toISOString());
  console.log('Event:', JSON.stringify(event, null, 2));
  console.log('========================================');

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'One-time schedule executed successfully',
      timestamp: new Date().toISOString(),
      detail: event.detail,
    }),
  };
};
