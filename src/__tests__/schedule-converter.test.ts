import {
  convertScheduleToNodeCron,
  convertRateExpression,
  convertCronExpression,
  isOneTimeSchedule,
  parseAtExpression,
} from '../utils/schedule-converter';

describe('convertRateExpression', () => {
  describe('minute rates', () => {
    it('should convert rate(1 minute)', () => {
      expect(convertRateExpression('rate(1 minute)')).toBe('*/1 * * * *');
    });

    it('should convert rate(5 minutes)', () => {
      expect(convertRateExpression('rate(5 minutes)')).toBe('*/5 * * * *');
    });

    it('should convert rate(15 minutes)', () => {
      expect(convertRateExpression('rate(15 minutes)')).toBe('*/15 * * * *');
    });

    it('should convert rate(30 minutes)', () => {
      expect(convertRateExpression('rate(30 minutes)')).toBe('*/30 * * * *');
    });
  });

  describe('hour rates', () => {
    it('should convert rate(1 hour)', () => {
      expect(convertRateExpression('rate(1 hour)')).toBe('0 */1 * * *');
    });

    it('should convert rate(2 hours)', () => {
      expect(convertRateExpression('rate(2 hours)')).toBe('0 */2 * * *');
    });

    it('should convert rate(6 hours)', () => {
      expect(convertRateExpression('rate(6 hours)')).toBe('0 */6 * * *');
    });

    it('should convert rate(12 hours)', () => {
      expect(convertRateExpression('rate(12 hours)')).toBe('0 */12 * * *');
    });
  });

  describe('day rates', () => {
    it('should convert rate(1 day)', () => {
      expect(convertRateExpression('rate(1 day)')).toBe('0 0 */1 * *');
    });

    it('should convert rate(7 days)', () => {
      expect(convertRateExpression('rate(7 days)')).toBe('0 0 */7 * *');
    });
  });

  describe('invalid rates', () => {
    it('should return null for invalid rate format', () => {
      expect(convertRateExpression('rate(invalid)')).toBe(null);
    });

    it('should return null for unsupported unit', () => {
      expect(convertRateExpression('rate(1 week)')).toBe(null);
    });
  });
});

describe('convertCronExpression', () => {
  it('should convert simple cron expression', () => {
    // AWS: cron(0 5 * * ? *) -> runs at 5:00 AM every day
    // node-cron: 0 5 * * *
    expect(convertCronExpression('cron(0 5 * * ? *)')).toBe('0 5 * * *');
  });

  it('should convert cron with ? to *', () => {
    // AWS: cron(0 12 ? * MON-FRI *) -> runs at noon on weekdays
    expect(convertCronExpression('cron(0 12 ? * MON-FRI *)')).toBe(
      '0 12 * * MON-FRI'
    );
  });

  it('should convert cron with 0/x to */x', () => {
    // AWS: cron(0/5 * * * ? *) -> runs every 5 minutes
    expect(convertCronExpression('cron(0/5 * * * ? *)')).toBe('*/5 * * * *');
  });

  it('should convert cron for hourly execution', () => {
    // AWS: cron(0 0/1 * * ? *) -> runs every hour
    expect(convertCronExpression('cron(0 0/1 * * ? *)')).toBe('0 */1 * * *');
  });

  it('should convert cron for specific time', () => {
    // AWS: cron(30 8 * * ? *) -> runs at 8:30 AM every day
    expect(convertCronExpression('cron(30 8 * * ? *)')).toBe('30 8 * * *');
  });

  it('should convert cron for first day of month', () => {
    // AWS: cron(0 9 1 * ? *) -> runs at 9 AM on first day of month
    expect(convertCronExpression('cron(0 9 1 * ? *)')).toBe('0 9 1 * *');
  });

  it('should convert cron for specific weekday', () => {
    // AWS: cron(0 18 ? * FRI *) -> runs at 6 PM every Friday
    expect(convertCronExpression('cron(0 18 ? * FRI *)')).toBe('0 18 * * FRI');
  });

  it('should convert multiple 0/x patterns', () => {
    // AWS: cron(0/15 0/2 * * ? *) -> runs every 15 min, every 2 hours
    expect(convertCronExpression('cron(0/15 0/2 * * ? *)')).toBe(
      '*/15 */2 * * *'
    );
  });

  describe('invalid cron expressions', () => {
    it('should return null for non-cron string', () => {
      expect(convertCronExpression('not a cron')).toBe(null);
    });

    it('should return null for rate expression', () => {
      expect(convertCronExpression('rate(5 minutes)')).toBe(null);
    });
  });
});

describe('convertScheduleToNodeCron', () => {
  it('should detect and convert rate expression', () => {
    expect(convertScheduleToNodeCron('rate(5 minutes)')).toBe('*/5 * * * *');
  });

  it('should detect and convert cron expression', () => {
    expect(convertScheduleToNodeCron('cron(0 5 * * ? *)')).toBe('0 5 * * *');
  });

  it('should return null for invalid format', () => {
    expect(convertScheduleToNodeCron('invalid')).toBe(null);
  });
});

describe('isOneTimeSchedule', () => {
  it('should return true for at() expression', () => {
    expect(isOneTimeSchedule('at(2024-06-15T10:00:00)')).toBe(true);
  });

  it('should return false for rate expression', () => {
    expect(isOneTimeSchedule('rate(5 minutes)')).toBe(false);
  });

  it('should return false for cron expression', () => {
    expect(isOneTimeSchedule('cron(0 12 * * ? *)')).toBe(false);
  });

  it('should return false for empty string', () => {
    expect(isOneTimeSchedule('')).toBe(false);
  });
});

describe('parseAtExpression', () => {
  it('should parse valid at() expression', () => {
    const result = parseAtExpression('at(2024-06-15T10:30:00)');
    expect(result).toEqual(new Date('2024-06-15T10:30:00'));
  });

  it('should parse at() with midnight time', () => {
    const result = parseAtExpression('at(2024-12-25T00:00:00)');
    expect(result).toEqual(new Date('2024-12-25T00:00:00'));
  });

  it('should parse at() with end of day time', () => {
    const result = parseAtExpression('at(2024-01-01T23:59:59)');
    expect(result).toEqual(new Date('2024-01-01T23:59:59'));
  });

  it('should return null for invalid format (missing parentheses)', () => {
    expect(parseAtExpression('at 2024-06-15T10:00:00')).toBeNull();
  });

  it('should return null for invalid format (wrong date format)', () => {
    expect(parseAtExpression('at(06-15-2024T10:00:00)')).toBeNull();
  });

  it('should return null for invalid date values', () => {
    expect(parseAtExpression('at(2024-13-45T99:99:99)')).toBeNull();
  });

  it('should return null for rate expression', () => {
    expect(parseAtExpression('rate(5 minutes)')).toBeNull();
  });

  it('should return null for cron expression', () => {
    expect(parseAtExpression('cron(0 12 * * ? *)')).toBeNull();
  });

  it('should return null for empty at()', () => {
    expect(parseAtExpression('at()')).toBeNull();
  });
});
