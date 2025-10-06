// Helper per gestire JSON in SQLite (che non ha tipo JSON nativo)

export function parseJsonField<T = any>(value: any): T {
  if (!value) return ([] as any);
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return ([] as any);
    }
  }
  return value;
}

export function stringifyJsonField(value: any): string {
  if (typeof value === 'string') return value;
  return JSON.stringify(value || []);
}