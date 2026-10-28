import { describe, expect, it } from 'vitest';
import { slugify } from '../src/slugify';

describe('slugify', () => {
  it('lower-cases and dashes words', () => expect(slugify('Hello World')).toBe('hello-world'));
  it('drops accents', () => expect(slugify('Crème brûlée')).toBe('creme-brulee'));
  it('trims dashes at the ends', () => expect(slugify('  hi  ')).toBe('hi'));
  it('collapses repeated dashes from whitespace', () => expect(slugify('Hello   World')).toBe('hello-world'));
  it('collapses repeated dashes from punctuation', () => expect(slugify('Tom & Jerry')).toBe('tom-jerry'));
  it('collapses mixed repeated separators', () => expect(slugify('a - _ b')).toBe('a-b'));
});
