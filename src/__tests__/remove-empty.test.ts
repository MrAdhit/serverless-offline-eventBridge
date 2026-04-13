import { removeEmpty } from '../utils/remove-empty';

describe('removeEmpty', () => {
  it('should remove null values from object', () => {
    const input = { a: 1, b: null, c: 'test' };
    const result = removeEmpty(input);
    expect(result).toEqual({ a: 1, c: 'test' });
  });

  it('should remove undefined values from object', () => {
    const input = { a: 1, b: undefined, c: 'test' };
    const result = removeEmpty(input);
    expect(result).toEqual({ a: 1, c: 'test' });
  });

  it('should handle nested objects', () => {
    const input = {
      a: 1,
      b: {
        c: null,
        d: 'nested',
        e: undefined,
      },
    };
    const result = removeEmpty(input);
    expect(result).toEqual({
      a: 1,
      b: {
        d: 'nested',
      },
    });
  });

  it('should preserve empty strings', () => {
    const input = { a: '', b: 'test' };
    const result = removeEmpty(input);
    expect(result).toEqual({ a: '', b: 'test' });
  });

  it('should preserve zero values', () => {
    const input = { a: 0, b: 1 };
    const result = removeEmpty(input);
    expect(result).toEqual({ a: 0, b: 1 });
  });

  it('should preserve false values', () => {
    const input = { a: false, b: true };
    const result = removeEmpty(input);
    expect(result).toEqual({ a: false, b: true });
  });

  it('should handle deeply nested objects', () => {
    const input = {
      level1: {
        level2: {
          level3: {
            value: 'deep',
            nullValue: null,
          },
        },
      },
    };
    const result = removeEmpty(input);
    expect(result).toEqual({
      level1: {
        level2: {
          level3: {
            value: 'deep',
          },
        },
      },
    });
  });

  it('should handle empty object', () => {
    const input = {};
    const result = removeEmpty(input);
    expect(result).toEqual({});
  });
});
