import {
  flattenObject,
  verifyIfValueMatchesEventBridgePattern,
  verifyIfValueMatchesEventBridgePatterns,
} from '../utils/pattern-matching';

describe('flattenObject', () => {
  it('should flatten a simple nested object', () => {
    const input = {
      level1: {
        level2: 'value',
      },
    };
    const result = flattenObject(input);
    expect(result).toEqual({ 'level1.level2': 'value' });
  });

  it('should flatten deeply nested objects', () => {
    const input = {
      a: {
        b: {
          c: {
            d: 'deep',
          },
        },
      },
    };
    const result = flattenObject(input);
    expect(result).toEqual({ 'a.b.c.d': 'deep' });
  });

  it('should preserve arrays as values', () => {
    const input = {
      key: ['value1', 'value2'],
    };
    const result = flattenObject(input);
    expect(result).toEqual({ key: ['value1', 'value2'] });
  });

  it('should handle mixed nested structures', () => {
    const input = {
      user: {
        name: 'John',
        address: {
          city: 'NYC',
        },
      },
      tags: ['a', 'b'],
    };
    const result = flattenObject(input);
    expect(result).toEqual({
      'user.name': 'John',
      'user.address.city': 'NYC',
      tags: ['a', 'b'],
    });
  });

  it('should handle empty object', () => {
    const result = flattenObject({});
    expect(result).toEqual({});
  });

  it('should handle flat object', () => {
    const input = { a: 1, b: 2 };
    const result = flattenObject(input);
    expect(result).toEqual({ a: 1, b: 2 });
  });
});

describe('verifyIfValueMatchesEventBridgePattern', () => {
  describe('scalar comparison', () => {
    it('should match exact string value', () => {
      const object = { Source: 'acme.orders' };
      expect(
        verifyIfValueMatchesEventBridgePattern(object, 'Source', 'acme.orders')
      ).toBe(true);
    });

    it('should not match different string value', () => {
      const object = { Source: 'acme.orders' };
      expect(
        verifyIfValueMatchesEventBridgePattern(object, 'Source', 'other.source')
      ).toBe(false);
    });

    it('should match numeric value', () => {
      const object = { count: 42 };
      expect(verifyIfValueMatchesEventBridgePattern(object, 'count', 42)).toBe(
        true
      );
    });

    it('should handle nested field access', () => {
      const object = { detail: { orderId: '12345' } };
      expect(
        verifyIfValueMatchesEventBridgePattern(
          object,
          'detail.orderId',
          '12345'
        )
      ).toBe(true);
    });
  });

  describe('prefix filter', () => {
    it('should match value with correct prefix', () => {
      const object = { Source: 'acme.orders.created' };
      expect(
        verifyIfValueMatchesEventBridgePattern(object, 'Source', {
          prefix: 'acme.',
        })
      ).toBe(true);
    });

    it('should not match value with wrong prefix', () => {
      const object = { Source: 'other.orders' };
      expect(
        verifyIfValueMatchesEventBridgePattern(object, 'Source', {
          prefix: 'acme.',
        })
      ).toBe(false);
    });

    it('should handle nested field prefix matching', () => {
      const object = { detail: { customerName: 'John Smith' } };
      expect(
        verifyIfValueMatchesEventBridgePattern(object, 'detail.customerName', {
          prefix: 'John',
        })
      ).toBe(true);
    });
  });

  describe('suffix filter', () => {
    it('should match value with correct suffix', () => {
      const object = { filename: 'document.pdf' };
      expect(
        verifyIfValueMatchesEventBridgePattern(object, 'filename', {
          suffix: '.pdf',
        })
      ).toBe(true);
    });

    it('should not match value with wrong suffix', () => {
      const object = { filename: 'document.txt' };
      expect(
        verifyIfValueMatchesEventBridgePattern(object, 'filename', {
          suffix: '.pdf',
        })
      ).toBe(false);
    });

    it('should handle occupation suffix example', () => {
      const object = { occupation: 'policeman' };
      expect(
        verifyIfValueMatchesEventBridgePattern(object, 'occupation', {
          suffix: 'man',
        })
      ).toBe(true);
    });
  });

  describe('exists filter', () => {
    it('should return true when field exists and exists: true', () => {
      const object = { name: 'John', age: 30 };
      expect(
        verifyIfValueMatchesEventBridgePattern(object, 'age', { exists: true })
      ).toBe(true);
    });

    it('should return false when field does not exist and exists: true', () => {
      const object = { name: 'John' };
      expect(
        verifyIfValueMatchesEventBridgePattern(object, 'age', { exists: true })
      ).toBe(false);
    });

    it('should return true when field does not exist and exists: false', () => {
      const object = { name: 'John' };
      expect(
        verifyIfValueMatchesEventBridgePattern(object, 'age', { exists: false })
      ).toBe(true);
    });

    it('should return false when field exists and exists: false', () => {
      const object = { name: 'John', age: 30 };
      expect(
        verifyIfValueMatchesEventBridgePattern(object, 'age', { exists: false })
      ).toBe(false);
    });
  });

  describe('anything-but filter', () => {
    it('should match when value is not in exclusion list', () => {
      const object = { status: 'active' };
      expect(
        verifyIfValueMatchesEventBridgePattern(object, 'status', {
          'anything-but': 'deleted',
        })
      ).toBe(true);
    });

    it('should not match when value is in exclusion list', () => {
      const object = { status: 'deleted' };
      expect(
        verifyIfValueMatchesEventBridgePattern(object, 'status', {
          'anything-but': 'deleted',
        })
      ).toBe(false);
    });

    it('should handle array of exclusions', () => {
      const object = { status: 'active' };
      expect(
        verifyIfValueMatchesEventBridgePattern(object, 'status', {
          'anything-but': ['deleted', 'archived'],
        })
      ).toBe(true);
    });

    it('should not match when value is in array exclusion', () => {
      const object = { status: 'archived' };
      expect(
        verifyIfValueMatchesEventBridgePattern(object, 'status', {
          'anything-but': ['deleted', 'archived'],
        })
      ).toBe(false);
    });
  });

  describe('equals-ignore-case filter', () => {
    it('should match with different casing', () => {
      const object = { status: 'ACTIVE' };
      expect(
        verifyIfValueMatchesEventBridgePattern(object, 'status', {
          'equals-ignore-case': 'active',
        })
      ).toBe(true);
    });

    it('should match with mixed casing', () => {
      const object = { status: 'AcTiVe' };
      expect(
        verifyIfValueMatchesEventBridgePattern(object, 'status', {
          'equals-ignore-case': 'ACTIVE',
        })
      ).toBe(true);
    });

    it('should not match different values', () => {
      const object = { status: 'inactive' };
      expect(
        verifyIfValueMatchesEventBridgePattern(object, 'status', {
          'equals-ignore-case': 'active',
        })
      ).toBe(false);
    });
  });

  describe('numeric filter', () => {
    it('should match greater than condition', () => {
      const object = { price: 100 };
      expect(
        verifyIfValueMatchesEventBridgePattern(object, 'price', {
          numeric: ['>', 50],
        })
      ).toBe(true);
    });

    it('should not match when value is less than condition', () => {
      const object = { price: 30 };
      expect(
        verifyIfValueMatchesEventBridgePattern(object, 'price', {
          numeric: ['>', 50],
        })
      ).toBe(false);
    });

    it('should match less than condition', () => {
      const object = { price: 30 };
      expect(
        verifyIfValueMatchesEventBridgePattern(object, 'price', {
          numeric: ['<', 50],
        })
      ).toBe(true);
    });

    it('should match greater than or equal condition', () => {
      const object = { price: 50 };
      expect(
        verifyIfValueMatchesEventBridgePattern(object, 'price', {
          numeric: ['>=', 50],
        })
      ).toBe(true);
    });

    it('should match less than or equal condition', () => {
      const object = { price: 50 };
      expect(
        verifyIfValueMatchesEventBridgePattern(object, 'price', {
          numeric: ['<=', 50],
        })
      ).toBe(true);
    });

    it('should match equal condition', () => {
      const object = { price: 50 };
      expect(
        verifyIfValueMatchesEventBridgePattern(object, 'price', {
          numeric: ['=', 50],
        })
      ).toBe(true);
    });

    it('should match range condition', () => {
      const object = { price: 75 };
      expect(
        verifyIfValueMatchesEventBridgePattern(object, 'price', {
          numeric: ['>=', 50, '<=', 100],
        })
      ).toBe(true);
    });

    it('should not match when outside range', () => {
      const object = { price: 150 };
      expect(
        verifyIfValueMatchesEventBridgePattern(object, 'price', {
          numeric: ['>=', 50, '<=', 100],
        })
      ).toBe(false);
    });
  });

  describe('array values in object', () => {
    it('should match when any array element matches', () => {
      const object = { tags: ['important', 'urgent', 'review'] };
      expect(
        verifyIfValueMatchesEventBridgePattern(object, 'tags', 'urgent')
      ).toBe(true);
    });

    it('should not match when no array element matches', () => {
      const object = { tags: ['important', 'review'] };
      expect(
        verifyIfValueMatchesEventBridgePattern(object, 'tags', 'urgent')
      ).toBe(false);
    });
  });

  describe('unsupported filter', () => {
    it('should throw error for unsupported filter type', () => {
      const object = { ip: '192.168.1.1' };
      expect(() => {
        verifyIfValueMatchesEventBridgePattern(object, 'ip', {
          cidr: '192.168.0.0/16',
        });
      }).toThrow('The cidr eventBridge filter is not supported');
    });
  });
});

describe('verifyIfValueMatchesEventBridgePatterns', () => {
  it('should return false when object is null', () => {
    expect(
      verifyIfValueMatchesEventBridgePatterns(null, 'field', ['value'])
    ).toBe(false);
  });

  it('should return false when object is undefined', () => {
    expect(
      verifyIfValueMatchesEventBridgePatterns(undefined, 'field', ['value'])
    ).toBe(false);
  });

  it('should match when any pattern matches (array of patterns)', () => {
    const object = { Source: 'acme.orders' };
    expect(
      verifyIfValueMatchesEventBridgePatterns(object, 'Source', [
        'acme.orders',
        'other.source',
      ])
    ).toBe(true);
  });

  it('should match with single pattern (not in array)', () => {
    const object = { Source: 'acme.orders' };
    expect(
      verifyIfValueMatchesEventBridgePatterns(object, 'Source', 'acme.orders')
    ).toBe(true);
  });

  it('should not match when no pattern matches', () => {
    const object = { Source: 'acme.orders' };
    expect(
      verifyIfValueMatchesEventBridgePatterns(object, 'Source', [
        'other.source',
        'another.source',
      ])
    ).toBe(false);
  });

  it('should match with mixed pattern types', () => {
    const object = { Source: 'acme.orders.created' };
    const patterns = [{ prefix: 'acme.' }, 'exact.match'];
    expect(
      verifyIfValueMatchesEventBridgePatterns(object, 'Source', patterns)
    ).toBe(true);
  });
});
