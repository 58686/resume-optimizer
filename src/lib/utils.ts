export function parseJsonArray<T>(value: string): T[] {
  try {
    const parsed = JSON.parse(value) as T[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function pickStructuredArray<T>(structured: T[], legacy: string): T[] {
  if (structured.length > 0) {
    return structured;
  }

  return parseJsonArray<T>(legacy);
}
