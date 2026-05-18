/**
 * Regression tests for `resolveLogicalFunctionName`.
 *
 * Background: when the plugin's `invokeTarget` fires a schedule, it
 * has to look up the target Lambda in serverless-offline's in-process
 * registry. That registry keys functions by their LOGICAL name from
 * `serverless.yml` (e.g. `dispatchScheduledMessages`), but real AWS
 * Lambda ARNs carry the DEPLOYED name following the serverless
 * convention `${service}-${stage}-${logical}`. Passing the deployed
 * name returns a stub whose `functionDefinition` is undefined, and
 * the subsequent `runHandler()` call blows up on `Cannot destructure
 * property 'handler' of 'functionDefinition' as it is undefined`.
 *
 * The helper strips the `${service}-${stage}-` prefix when both pieces
 * are supplied, otherwise returns the segment unchanged (preserving
 * the example-style usage where the ARN already carries the logical
 * name).
 */
import { resolveLogicalFunctionName } from '../scheduler-server';

const FULL_ARN = (deployedName: string) =>
  `arn:aws:lambda:us-east-1:000000000000:function:${deployedName}`;

describe('resolveLogicalFunctionName', () => {
  it('strips the service-stage prefix when both are supplied and the ARN matches', () => {
    const arn = FULL_ARN(
      'gigradar-workers-api-local-dispatchScheduledMessages'
    );
    expect(
      resolveLogicalFunctionName(arn, 'gigradar-workers-api', 'local')
    ).toBe('dispatchScheduledMessages');
  });

  it('keeps the deployed name when serviceName is omitted', () => {
    const arn = FULL_ARN(
      'gigradar-workers-api-local-dispatchScheduledMessages'
    );
    expect(resolveLogicalFunctionName(arn, undefined, 'local')).toBe(
      'gigradar-workers-api-local-dispatchScheduledMessages'
    );
  });

  it('keeps the deployed name when stage is omitted', () => {
    const arn = FULL_ARN(
      'gigradar-workers-api-local-dispatchScheduledMessages'
    );
    expect(
      resolveLogicalFunctionName(arn, 'gigradar-workers-api', undefined)
    ).toBe('gigradar-workers-api-local-dispatchScheduledMessages');
  });

  it('keeps the deployed name when the prefix does not match', () => {
    // Different service. Don't accidentally strip; an external-account
    // ARN (which real AWS would never deliver here anyway) should pass
    // through verbatim so the lookup fails cleanly.
    const arn = FULL_ARN('other-service-stage-someFn');
    expect(
      resolveLogicalFunctionName(arn, 'gigradar-workers-api', 'local')
    ).toBe('other-service-stage-someFn');
  });

  it('handles the legacy example shape where ARN already carries the logical name', () => {
    // The plugin's own examples ARN like `...:function:targetFunction`,
    // i.e. the logical name without a service/stage prefix. Strip
    // should be a no-op in that case.
    const arn = FULL_ARN('targetFunction');
    expect(
      resolveLogicalFunctionName(arn, 'gigradar-workers-api', 'local')
    ).toBe('targetFunction');
  });

  it('keeps function names that legitimately contain the service prefix as a suffix', () => {
    // Edge case: a logical name happens to coincide with the prefix
    // pattern. We strip strictly by `startsWith`, so anything past the
    // first occurrence of `${service}-${stage}-` is preserved.
    const arn = FULL_ARN('gigradar-workers-api-local-fn-with-dashes');
    expect(
      resolveLogicalFunctionName(arn, 'gigradar-workers-api', 'local')
    ).toBe('fn-with-dashes');
  });
});
