import { TestCase } from '../types';

export function normalizeTitle(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function findDuplicateTitle(
  name: string,
  testCases: TestCase[],
  excludeId?: string
): TestCase | null {
  const norm = normalizeTitle(name);
  if (!norm) return null;
  return (
    testCases.find(
      tc => tc.id !== excludeId && normalizeTitle(tc.name) === norm
    ) || null
  );
}

export function findSimilarTitles(
  name: string,
  testCases: TestCase[],
  excludeId?: string
): TestCase[] {
  const norm = normalizeTitle(name);
  if (!norm || norm.length < 2) return [];
  return testCases.filter(tc => {
    if (tc.id === excludeId) return false;
    const other = normalizeTitle(tc.name);
    return other === norm || (other.includes(norm) && norm.length >= 3) || (norm.includes(other) && other.length >= 3);
  });
}
