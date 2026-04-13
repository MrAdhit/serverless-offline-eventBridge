import {
  convertEntryToEvent,
  generateEventBridgeResponse,
  generateEventId,
  EventBridgeEntry,
} from '../utils/event-converter';

describe('generateEventId', () => {
  it('should generate a string ID', () => {
    const id = generateEventId();
    expect(typeof id).toBe('string');
  });

  it('should generate IDs with timestamp suffix', () => {
    const id1 = generateEventId();
    // Extract the timestamp portion
    const timestamp = id1.split('-').pop();
    expect(timestamp).toBeDefined();
    // Verify it's a valid timestamp (numeric)
    expect(Number(timestamp)).toBeGreaterThan(0);
  });

  it('should follow expected format', () => {
    const id = generateEventId();
    expect(id).toMatch(/^xxxxxxxx-xxxx-xxxx-xxxx-\d+$/);
  });
});

describe('convertEntryToEvent', () => {
  const mockConfig = {
    region: 'us-east-1',
    accountId: '123456789012',
  };

  it('should convert a basic entry to event', () => {
    const entry: EventBridgeEntry = {
      Source: 'acme.orders',
      DetailType: 'OrderCreated',
      Detail: JSON.stringify({ orderId: '12345' }),
    };

    const event = convertEntryToEvent(entry, undefined, mockConfig);

    expect(event.version).toBe('0');
    expect(event.id).toMatch(/^xxxxxxxx-xxxx-xxxx-xxxx-\d+$/);
    expect(event.source).toBe('acme.orders');
    expect(event['detail-type']).toBe('OrderCreated');
    expect(event.detail).toEqual({ orderId: '12345' });
    expect(event.account).toBe('123456789012');
    expect(event.region).toBe('us-east-1');
    expect(event.resources).toEqual([]);
  });

  it('should include resources when provided', () => {
    const entry: EventBridgeEntry = {
      Source: 'acme.orders',
      Detail: '{}',
      Resources: ['arn:aws:ec2:us-east-1:123456789012:instance/i-12345'],
    };

    const event = convertEntryToEvent(entry, undefined, mockConfig);

    expect(event.resources).toEqual([
      'arn:aws:ec2:us-east-1:123456789012:instance/i-12345',
    ]);
  });

  it('should merge input with event', () => {
    const entry: EventBridgeEntry = {
      Source: 'acme.orders',
      Detail: '{}',
    };
    const input = {
      customField: 'customValue',
    };

    const event = convertEntryToEvent(entry, input as any, mockConfig);

    expect((event as any).customField).toBe('customValue');
    expect(event.source).toBe('acme.orders');
  });

  it('should handle complex detail JSON', () => {
    const detail = {
      orderId: '12345',
      items: [
        { sku: 'ABC123', quantity: 2 },
        { sku: 'XYZ789', quantity: 1 },
      ],
      customer: {
        name: 'John Doe',
        email: 'john@example.com',
      },
    };

    const entry: EventBridgeEntry = {
      Source: 'acme.orders',
      Detail: JSON.stringify(detail),
    };

    const event = convertEntryToEvent(entry, undefined, mockConfig);

    expect(event.detail).toEqual(detail);
  });

  it('should handle missing DetailType', () => {
    const entry: EventBridgeEntry = {
      Source: 'acme.orders',
      Detail: '{}',
    };

    const event = convertEntryToEvent(entry, undefined, mockConfig);

    expect(event['detail-type']).toBeUndefined();
  });

  it('should handle missing config', () => {
    const entry: EventBridgeEntry = {
      Source: 'acme.orders',
      Detail: '{}',
    };

    const event = convertEntryToEvent(entry, undefined, undefined);

    expect(event.account).toBeUndefined();
    expect(event.region).toBeUndefined();
  });

  it('should have valid ISO timestamp', () => {
    const entry: EventBridgeEntry = {
      Source: 'acme.orders',
      Detail: '{}',
    };

    const event = convertEntryToEvent(entry, undefined, mockConfig);

    // Verify it's a valid ISO date string
    const parsedDate = new Date(event.time);
    expect(parsedDate.toISOString()).toBe(event.time);
  });

  it('should handle empty Detail', () => {
    const entry: EventBridgeEntry = {
      Source: 'acme.orders',
    };

    const event = convertEntryToEvent(entry, undefined, mockConfig);

    expect(event.detail).toEqual({});
  });
});

describe('generateEventBridgeResponse', () => {
  it('should generate response for single entry', () => {
    const entries = [{ Source: 'test' }];
    const response = generateEventBridgeResponse(entries);

    expect(response.FailedEntryCount).toBe(0);
    expect(response.Entries).toHaveLength(1);
    expect(response.Entries[0].EventId).toMatch(
      /^xxxxxxxx-xxxx-xxxx-xxxx-\d+$/
    );
  });

  it('should generate response for multiple entries', () => {
    const entries = [
      { Source: 'test1' },
      { Source: 'test2' },
      { Source: 'test3' },
    ];
    const response = generateEventBridgeResponse(entries);

    expect(response.FailedEntryCount).toBe(0);
    expect(response.Entries).toHaveLength(3);
    response.Entries.forEach((entry) => {
      expect(entry.EventId).toMatch(/^xxxxxxxx-xxxx-xxxx-xxxx-\d+$/);
    });
  });

  it('should generate response for empty entries', () => {
    const response = generateEventBridgeResponse([]);

    expect(response.FailedEntryCount).toBe(0);
    expect(response.Entries).toHaveLength(0);
  });

  it('should generate EventId for each entry', () => {
    const entries = [{ Source: 'test1' }, { Source: 'test2' }];
    const response = generateEventBridgeResponse(entries);

    // Each entry should have an EventId
    response.Entries.forEach((entry) => {
      expect(entry.EventId).toBeDefined();
      expect(entry.EventId).toMatch(/^xxxxxxxx-xxxx-xxxx-xxxx-\d+$/);
    });
  });
});
