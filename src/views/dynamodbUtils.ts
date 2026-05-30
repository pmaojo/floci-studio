export function unmarshalItem(item: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(item)) {
    result[key] = unmarshalValue(value);
  }
  return result;
}

export function unmarshalValue(value: any): any {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'object') return value;

  const keys = Object.keys(value);
  if (keys.length === 0) return value;

  const type = keys[0];
  const val = value[type];

  switch (type) {
    case 'S':
      return val;
    case 'N':
      return Number(val);
    case 'BOOL':
      return val === true || val === 'true';
    case 'NULL':
      return null;
    case 'L':
      return Array.isArray(val) ? val.map(unmarshalValue) : [];
    case 'M':
      return typeof val === 'object' ? unmarshalItem(val) : {};
    case 'SS':
      return Array.isArray(val) ? val : [];
    case 'NS':
      return Array.isArray(val) ? val.map(Number) : [];
    default:
      return val;
  }
}

export function marshalItem(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = marshalValue(value);
    }
  }
  return result;
}

export function marshalValue(value: any): any {
  if (value === null) return { NULL: true };
  if (typeof value === 'boolean') return { BOOL: value };
  if (typeof value === 'number') return { N: String(value) };
  if (typeof value === 'string') return { S: value };

  if (Array.isArray(value)) {
    return { L: value.map(marshalValue) };
  }

  if (typeof value === 'object') {
    return { M: marshalItem(value) };
  }

  return { S: String(value) };
}
