import { describe, expect, test } from 'vitest';
import { filterComponents, parseFilterArg } from '../cli/filter';

describe('parseFilterArg', () => {
  test('returns null when no filter provided', () => {
    expect(parseFilterArg(['--ios'])).toBeNull();
    expect(parseFilterArg([])).toBeNull();
  });

  test('parses --filter=pattern format', () => {
    expect(parseFilterArg(['--filter=Button_*'])).toBe('Button_*');
    expect(parseFilterArg(['--ios', '--filter=Card_*'])).toBe('Card_*');
  });

  test('parses --filter pattern format', () => {
    expect(parseFilterArg(['--filter', 'Button_*'])).toBe('Button_*');
    expect(parseFilterArg(['--ios', '--filter', 'Card_*'])).toBe('Card_*');
  });

  test('does not treat flags as filter value', () => {
    expect(parseFilterArg(['--filter', '--ios'])).toBeNull();
  });
});

describe('filterComponents', () => {
  const components = [
    'Button_Primary',
    'Button_Secondary',
    'Button_Disabled',
    'Card_Simple',
    'Card_WithTitle',
    'Badge_Success',
    'Badge_Error',
  ];

  test('returns all components when filter is null', () => {
    expect(filterComponents(components, null)).toEqual(components);
  });

  test('filters by wildcard pattern', () => {
    expect(filterComponents(components, 'Button_*')).toEqual([
      'Button_Primary',
      'Button_Secondary',
      'Button_Disabled',
    ]);
  });

  test('filters by exact match', () => {
    expect(filterComponents(components, 'Button_Primary')).toEqual([
      'Button_Primary',
    ]);
  });

  test('filters by multiple patterns (comma-separated)', () => {
    expect(filterComponents(components, 'Button_Primary,Card_Simple')).toEqual([
      'Button_Primary',
      'Card_Simple',
    ]);
  });

  test('filters by wildcard with multiple patterns', () => {
    expect(filterComponents(components, 'Button_*,Badge_*')).toEqual([
      'Button_Primary',
      'Button_Secondary',
      'Button_Disabled',
      'Badge_Success',
      'Badge_Error',
    ]);
  });

  test('excludes with ! prefix', () => {
    expect(filterComponents(components, '!*_Disabled')).toEqual([
      'Button_Primary',
      'Button_Secondary',
      'Card_Simple',
      'Card_WithTitle',
      'Badge_Success',
      'Badge_Error',
    ]);
  });

  test('combines include and exclude patterns', () => {
    expect(filterComponents(components, 'Button_*,!Button_Disabled')).toEqual([
      'Button_Primary',
      'Button_Secondary',
    ]);
  });

  test('returns empty array when no matches', () => {
    expect(filterComponents(components, 'NonExistent_*')).toEqual([]);
  });

  test('handles single character wildcard (?)', () => {
    const items = ['A1', 'A2', 'A10', 'B1'];
    expect(filterComponents(items, 'A?')).toEqual(['A1', 'A2']);
  });
});
