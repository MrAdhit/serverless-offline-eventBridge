/**
 * Handler for static scheduler events
 * These are scheduled via serverless.yml configuration
 */

export const run = async (event) => {
  console.log('Scheduler event received at:', new Date().toISOString());
  console.log('Event:', JSON.stringify(event, null, 2));

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Scheduled task executed successfully',
      timestamp: new Date().toISOString(),
      input: event.detail,
    }),
  };
};

export const cronRun = async (event) => {
  console.log('Cron scheduler event received at:', new Date().toISOString());
  console.log('Event:', JSON.stringify(event, null, 2));

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Cron task executed successfully',
      timestamp: new Date().toISOString(),
    }),
  };
};

export const simpleRun = async (event) => {
  console.log('Simple scheduler event received at:', new Date().toISOString());
  console.log('Event:', JSON.stringify(event, null, 2));

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Simple task executed successfully',
      timestamp: new Date().toISOString(),
    }),
  };
};
