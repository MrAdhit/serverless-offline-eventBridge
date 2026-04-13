import * as jsonpath from 'jsonpath';

/**
 * Flatten a nested object into a single-level object with dot-notation keys
 */
export function flattenObject(object: any, prefix = ''): any {
  return Object.entries(object).reduce(
    (accumulator, [key, value]) =>
      value &&
      value instanceof Object &&
      !(value instanceof Date) &&
      !Array.isArray(value)
        ? {
            ...accumulator,
            ...flattenObject(value, (prefix && `${prefix}.`) + key),
          }
        : { ...accumulator, [(prefix && `${prefix}.`) + key]: value },
    {}
  );
}

/**
 * Implementation of content-based filtering specific to Eventbridge event patterns
 * https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-event-patterns-content-based-filtering.html
 */
export function verifyIfValueMatchesEventBridgePattern(
  object: any,
  field: any,
  pattern: any
): boolean {
  const splitField = field.split('.');
  const requiredJsonPathString = splitField.reduce(
    (accumulator: string, currentField: string) => {
      const objectPath = `${accumulator}.${currentField}`;
      const arrayPath = `${objectPath}[:]`;
      return jsonpath.query(object, arrayPath, 1).length > 0
        ? arrayPath
        : objectPath;
    },
    '$'
  );

  // evaluatedValues will ALWAYS be an array, since it's the result of a jsonpath query.
  const evaluatedValues = jsonpath.query(object, requiredJsonPathString);

  // Simple scalar comparison
  if (typeof pattern !== 'object') {
    return evaluatedValues.includes(pattern);
  }

  // "exists" filters
  if ('exists' in pattern) {
    return pattern.exists
      ? evaluatedValues.length > 0
      : evaluatedValues.length === 0;
  }

  if ('anything-but' in pattern) {
    const evaluatePattern = Array.isArray(pattern['anything-but'])
      ? pattern['anything-but']
      : [pattern['anything-but']];
    return !evaluatedValues.some((v) => evaluatePattern.includes(v));
  }

  const filterType = Object.keys(pattern)[0];

  if (filterType === 'prefix') {
    return evaluatedValues.some((value) => value.startsWith(pattern.prefix));
  }

  if (filterType === 'suffix') {
    return evaluatedValues.some((value) => value.endsWith(pattern.suffix));
  }

  if (filterType === 'equals-ignore-case') {
    return evaluatedValues.some(
      (value) =>
        value.toLowerCase() === pattern['equals-ignore-case'].toLowerCase()
    );
  }

  if ('numeric' in pattern) {
    // partition an array to be like [[">", 5], ["=",30]]
    const chunk: any = (arr = [], num = 2) => {
      if (arr.length === 0) return arr;
      return Array(arr.splice(0, num)).concat(chunk(arr, num));
    };

    // persist pattern for preventing to mutate an array.
    const origin = [...pattern.numeric];

    const operationGroups = chunk(origin, 2);

    return evaluatedValues.some((value: any) =>
      // Expected all event pattern should be true
      operationGroups.every((arr: any) => {
        const lvalue = parseFloat(value);
        const rvalue = parseFloat(arr[arr.length - 1]);
        const operator = arr[0];

        return (
          {
            '>': lvalue > rvalue,
            '<': lvalue < rvalue,
            '>=': lvalue >= rvalue,
            '<=': lvalue <= rvalue,
            '=': lvalue === rvalue,
          } as any
        )[operator];
      })
    );
  }

  // "cidr" filters and the recurring logic are yet supported by this plugin.
  throw new Error(
    `The ${filterType} eventBridge filter is not supported in serverless-offline-aws-eventBridge yet. ` +
      `Please consider submitting a PR to support it.`
  );
}

/**
 * Verify if a value matches any of the EventBridge patterns
 */
export function verifyIfValueMatchesEventBridgePatterns(
  object: any,
  field: any,
  patterns: any
): boolean {
  if (!object) {
    return false;
  }

  const matchPatterns = Array.isArray(patterns) ? patterns : [patterns];

  return matchPatterns.some((pattern) =>
    verifyIfValueMatchesEventBridgePattern(object, field, pattern)
  );
}
