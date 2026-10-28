import { describe, expect, it } from 'vitest';
import { truncate } from '../src/truncate';

describe('truncate', () => {
  it('keeps short strings', () => expect(truncate('abc', 5)).toBe('abc'));
  it('adds an ellipsis when cut', () => expect(truncate('abcdefgh', 6).endsWith('…')).toBe(true));
});
