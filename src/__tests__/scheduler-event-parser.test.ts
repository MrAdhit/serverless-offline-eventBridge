import {
  isSchedulerEnabled,
  normalizeSchedulerConfig,
  parseSchedulerEvent,
} from '../utils/scheduler-event-parser';

describe('isSchedulerEnabled', () => {
  it('should return true for string shorthand', () => {
    expect(isSchedulerEnabled('rate(5 minutes)')).toBe(true);
  });

  it('should return true when enabled is undefined', () => {
    expect(isSchedulerEnabled({ schedule: 'rate(5 minutes)' })).toBe(true);
  });

  it('should return true when enabled is true', () => {
    expect(
      isSchedulerEnabled({ schedule: 'rate(5 minutes)', enabled: true })
    ).toBe(true);
  });

  it('should return false when enabled is false', () => {
    expect(
      isSchedulerEnabled({ schedule: 'rate(5 minutes)', enabled: false })
    ).toBe(false);
  });
});

describe('normalizeSchedulerConfig', () => {
  it('should convert string to object with schedule property', () => {
    const result = normalizeSchedulerConfig('rate(5 minutes)');
    expect(result).toEqual({ schedule: 'rate(5 minutes)' });
  });

  it('should return object as-is', () => {
    const config = {
      schedule: 'rate(5 minutes)',
      timezone: 'America/New_York',
    };
    const result = normalizeSchedulerConfig(config);
    expect(result).toBe(config);
  });
});

describe('parseSchedulerEvent', () => {
  describe('rate expressions', () => {
    it('should parse string shorthand rate expression', () => {
      const result = parseSchedulerEvent('rate(5 minutes)', 'myFunction');

      expect(result).not.toBeNull();
      expect(result?.schedule).toBe('*/5 * * * *');
      expect(result?.functionKey).toBe('myFunction');
      expect(result?.isOneTime).toBe(false);
      expect(result?.executeAt).toBeUndefined();
    });

    it('should parse object config with rate expression', () => {
      const result = parseSchedulerEvent(
        { schedule: 'rate(1 hour)', timezone: 'America/New_York' },
        'myFunction'
      );

      expect(result?.schedule).toBe('0 */1 * * *');
      expect(result?.timezone).toBe('America/New_York');
      expect(result?.isOneTime).toBe(false);
    });

    it('should parse rate with days', () => {
      const result = parseSchedulerEvent('rate(1 day)', 'myFunction');
      expect(result?.schedule).toBe('0 0 */1 * *');
    });
  });

  describe('cron expressions', () => {
    it('should parse cron expression', () => {
      const result = parseSchedulerEvent(
        { schedule: 'cron(0 12 * * ? *)' },
        'myFunction'
      );

      expect(result?.schedule).toBe('0 12 * * *');
      expect(result?.isOneTime).toBe(false);
    });

    it('should convert ? to * in cron', () => {
      const result = parseSchedulerEvent('cron(0 18 ? * FRI *)', 'myFunction');
      expect(result?.schedule).toBe('0 18 * * FRI');
    });
  });

  describe('one-time at() expressions', () => {
    it('should parse at() expression', () => {
      const result = parseSchedulerEvent(
        'at(2024-06-15T10:30:00)',
        'myFunction'
      );

      expect(result).not.toBeNull();
      expect(result?.schedule).toBe('at(2024-06-15T10:30:00)');
      expect(result?.isOneTime).toBe(true);
      expect(result?.executeAt).toEqual(new Date('2024-06-15T10:30:00'));
    });

    it('should parse at() with object config', () => {
      const result = parseSchedulerEvent(
        {
          schedule: 'at(2024-12-25T09:00:00)',
          name: 'christmas-reminder',
          input: { message: 'Merry Christmas!' },
        },
        'reminderFunction'
      );

      expect(result?.isOneTime).toBe(true);
      expect(result?.executeAt).toEqual(new Date('2024-12-25T09:00:00'));
      expect(result?.event.name).toBe('christmas-reminder');
      expect(result?.event.input).toEqual({ message: 'Merry Christmas!' });
    });

    it('should return null for invalid at() format', () => {
      const result = parseSchedulerEvent('at(invalid-date)', 'myFunction');
      expect(result).toBeNull();
    });

    it('should return null for at() with invalid date', () => {
      const result = parseSchedulerEvent(
        'at(2024-13-45T99:99:99)',
        'myFunction'
      );
      expect(result).toBeNull();
    });
  });

  describe('disabled schedules', () => {
    it('should return null for disabled scheduler', () => {
      const result = parseSchedulerEvent(
        { schedule: 'rate(5 minutes)', enabled: false },
        'myFunction'
      );

      expect(result).toBeNull();
    });
  });

  describe('invalid schedules', () => {
    it('should return null for empty schedule', () => {
      const result = parseSchedulerEvent({ schedule: '' }, 'myFunction');
      expect(result).toBeNull();
    });

    it('should return null for invalid rate format', () => {
      const result = parseSchedulerEvent('rate(invalid)', 'myFunction');
      expect(result).toBeNull();
    });

    it('should return null for invalid cron format', () => {
      const result = parseSchedulerEvent('invalid-schedule', 'myFunction');
      expect(result).toBeNull();
    });
  });

  describe('input preservation', () => {
    it('should preserve input in the event', () => {
      const result = parseSchedulerEvent(
        {
          schedule: 'rate(5 minutes)',
          input: { key: 'value', nested: { data: true } },
        },
        'myFunction'
      );

      expect(result?.event.input).toEqual({
        key: 'value',
        nested: { data: true },
      });
    });
  });

  describe('timezone handling', () => {
    it('should preserve timezone for recurring schedules', () => {
      const result = parseSchedulerEvent(
        { schedule: 'rate(1 hour)', timezone: 'Europe/London' },
        'myFunction'
      );

      expect(result?.timezone).toBe('Europe/London');
    });

    it('should preserve timezone for one-time schedules', () => {
      const result = parseSchedulerEvent(
        { schedule: 'at(2024-06-15T10:00:00)', timezone: 'Asia/Tokyo' },
        'myFunction'
      );

      expect(result?.timezone).toBe('Asia/Tokyo');
    });

    it('should have undefined timezone when not specified', () => {
      const result = parseSchedulerEvent('rate(5 minutes)', 'myFunction');
      expect(result?.timezone).toBeUndefined();
    });
  });
});
