import type { Input } from 'serverless/plugins/aws/provider/awsProvider';

export interface EventBridgeEntry {
  EventBusName?: string;
  Source?: string;
  DetailType?: string;
  Detail?: string;
  Resources?: string[];
  Time?: string;
}

export interface EventBridgeEvent {
  version: string;
  id: string;
  source?: string;
  account?: string;
  time: string;
  region?: string;
  resources: string[];
  detail: any;
  'detail-type'?: string;
}

/**
 * Generate a unique event ID
 */
export function generateEventId(): string {
  return `xxxxxxxx-xxxx-xxxx-xxxx-${new Date().getTime()}`;
}

/**
 * Convert an EventBridge entry to an EventBridge event format
 * that is passed to Lambda handlers
 */
export function convertEntryToEvent(
  entry: EventBridgeEntry,
  input: Input | undefined,
  config?: { region?: string; accountId?: string }
): EventBridgeEvent {
  const event: EventBridgeEvent = {
    ...(input || {}),
    version: '0',
    id: generateEventId(),
    source: entry.Source,
    account: config?.accountId,
    time: new Date().toISOString(),
    region: config?.region,
    resources: entry.Resources || [],
    detail: entry.Detail ? JSON.parse(entry.Detail) : {},
  };

  if (entry.DetailType) {
    event['detail-type'] = entry.DetailType;
  }

  return event;
}

/**
 * Generate an EventBridge PutEvents response
 * https://docs.aws.amazon.com/eventbridge/latest/APIReference/API_PutEvents.html
 */
export function generateEventBridgeResponse(entries: Array<unknown>) {
  return {
    Entries: entries.map(() => ({
      EventId: generateEventId(),
    })),
    FailedEntryCount: 0,
  };
}
