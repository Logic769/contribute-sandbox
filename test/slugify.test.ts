import { describe, expect, it } from 'vitest';
import { slugify } from '../src/slugify';

describe('slugify', () => {
  it('lower-cases and dashes words', () => expect(slugify('Hello World')).toBe('hello-world'));
  it('drops accents', () => expect(slugify('Crème brûlée')).toBe('creme-brulee'));
  it('trims dashes at the ends', () => expect(slugify('  hi  ')).toBe('hi'));
});
