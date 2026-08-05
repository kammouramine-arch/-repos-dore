import { AppError } from '@/core/domain/errors/appError';
import {
  array,
  asNumber,
  asNumericString,
  asRecord,
  asString,
  field,
  lenientArray,
  optional,
} from './decode';

const expectInvalid = (run: () => unknown) => {
  expect(run).toThrow(AppError);
  try {
    run();
  } catch (error) {
    expect((error as AppError).code).toBe('invalid-response');
  }
};

describe('scalar decoders', () => {
  it('accept the right shapes', () => {
    expect(asString('hello', 'p')).toBe('hello');
    expect(asNumber(42, 'p')).toBe(42);
    expect(asNumericString('48.8566', 'p')).toBeCloseTo(48.8566, 6);
    expect(asRecord({ a: 1 }, 'p')).toEqual({ a: 1 });
  });

  it('reject the wrong ones as invalid responses', () => {
    expectInvalid(() => asString(42, 'p'));
    expectInvalid(() => asNumber('42', 'p'));
    expectInvalid(() => asNumber(Number.NaN, 'p'));
    expectInvalid(() => asNumber(Number.POSITIVE_INFINITY, 'p'));
    expectInvalid(() => asNumericString('not a number', 'p'));
    expectInvalid(() => asRecord([], 'p'));
    expectInvalid(() => asRecord(null, 'p'));
  });
});

describe('optional', () => {
  it('treats null and undefined as absent', () => {
    expect(optional(asString)(undefined, 'p')).toBeUndefined();
    expect(optional(asString)(null, 'p')).toBeUndefined();
  });

  it('still validates a present value', () => {
    expect(optional(asString)('here', 'p')).toBe('here');
    expectInvalid(() => optional(asString)(7, 'p'));
  });
});

describe('array', () => {
  it('decodes every element', () => {
    expect(array(asNumber)([1, 2, 3], 'p')).toEqual([1, 2, 3]);
  });

  it('rejects the whole list if one element is wrong', () => {
    // Strict on purpose: a dropped route step would misdirect the driver.
    expectInvalid(() => array(asNumber)([1, 'two', 3], 'p'));
  });
});

describe('lenientArray', () => {
  it('keeps what it can and drops what it cannot', () => {
    expect(lenientArray(asNumber)([1, 'two', 3], 'p')).toEqual([1, 3]);
  });

  it('still requires an array', () => {
    expectInvalid(() => lenientArray(asNumber)('nope', 'p'));
  });
});

describe('field', () => {
  it('reports the path of the offending key', () => {
    try {
      field({ distance: 'far' }, 'distance', asNumber, 'route');
      throw new Error('should have thrown');
    } catch (error) {
      expect((error as AppError).cause).toContain('route.distance');
    }
  });
});
