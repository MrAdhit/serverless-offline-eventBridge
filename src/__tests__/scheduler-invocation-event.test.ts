/**
 * Regression tests for `buildSchedulerInvocationEvent`.
 *
 * Background: an earlier version of this plugin wrapped the schedule's
 * `Input` payload inside an EventBridge-Rules-shaped envelope
 * (`{ source: 'aws.scheduler', 'detail-type': 'Scheduled Event',
 * detail: <Input>, ... }`). That schema belongs to the older
 * EventBridge Rules / `aws.events` product, NOT to EventBridge
 * Scheduler. Real AWS EventBridge Scheduler delivers `Input` parsed
 * and unwrapped as the Lambda event payload — handlers written
 * against real AWS access fields like `event._trigger` directly, not
 * `event.detail._trigger`. Locking that down here.
 */
import { buildSchedulerInvocationEvent } from '../scheduler-server';

describe('buildSchedulerInvocationEvent', () => {
  it('returns the parsed JSON as the event when Input is a JSON object', () => {
    const event = buildSchedulerInvocationEvent(
      JSON.stringify({
        _trigger: 'eb_scheduled_message',
        scheduledMessageId: 'abc',
      })
    );
    expect(event).toEqual({
      _trigger: 'eb_scheduled_message',
      scheduledMessageId: 'abc',
    });
  });

  it('does NOT wrap the payload in an EventBridge-Rules envelope', () => {
    const event = buildSchedulerInvocationEvent(
      JSON.stringify({ _trigger: 'eb_wakeup', wakeupId: 'w_1' })
    ) as Record<string, unknown>;
    // Real AWS EB Scheduler delivers Input as-is. Asserting on the
    // absence of envelope fields catches future regressions where
    // someone "helpfully" re-adds the wrapping.
    expect(event['source']).toBeUndefined();
    expect(event['detail-type']).toBeUndefined();
    expect(event['detail']).toBeUndefined();
    expect(event['version']).toBeUndefined();
    expect(event['resources']).toBeUndefined();
    // The payload's own fields are at the top level.
    expect(event['_trigger']).toBe('eb_wakeup');
    expect(event['wakeupId']).toBe('w_1');
  });

  it('returns {} when Input is omitted', () => {
    expect(buildSchedulerInvocationEvent(undefined)).toEqual({});
  });

  it('returns {} when Input is the empty string', () => {
    expect(buildSchedulerInvocationEvent('')).toEqual({});
  });

  it('passes a non-JSON string through verbatim', () => {
    // AWS accepts any string at the API; the Lambda is responsible for
    // parsing. Mirror that rather than throwing or coercing.
    expect(buildSchedulerInvocationEvent('not-json')).toBe('not-json');
  });

  it('parses primitive JSON values (number, boolean, null, array)', () => {
    expect(buildSchedulerInvocationEvent('42')).toBe(42);
    expect(buildSchedulerInvocationEvent('true')).toBe(true);
    expect(buildSchedulerInvocationEvent('null')).toBeNull();
    expect(buildSchedulerInvocationEvent('[1,2,3]')).toEqual([1, 2, 3]);
  });

  it('reports invalid-JSON via the logDebug callback when provided', () => {
    const logDebug = jest.fn();
    const event = buildSchedulerInvocationEvent('garbled{', logDebug);
    expect(event).toBe('garbled{');
    expect(logDebug).toHaveBeenCalledWith(
      'Input is not valid JSON, passing raw string'
    );
  });

  it('does not call logDebug when Input parses cleanly', () => {
    const logDebug = jest.fn();
    buildSchedulerInvocationEvent('{"ok":true}', logDebug);
    expect(logDebug).not.toHaveBeenCalled();
  });

  it('does not call logDebug when Input is omitted', () => {
    const logDebug = jest.fn();
    buildSchedulerInvocationEvent(undefined, logDebug);
    expect(logDebug).not.toHaveBeenCalled();
  });
});
