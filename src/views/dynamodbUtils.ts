import type { AttributeValue } from '@aws-sdk/client-dynamodb';

export function unmarshalItem(item: Record<string, AttributeValue>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(item)) {
    result[key] = unmarshalValue(value);
  }
  return result;
}

export function unmarshalValue(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'object') return value;

  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj);
  if (keys.length === 0) return value;

  const type = keys[0];
  const val = obj[type];

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
      return typeof val === 'object' && val !== null ? unmarshalItem(val as Record<string, AttributeValue>) : {};
    case 'SS':
      return Array.isArray(val) ? val : [];
    case 'NS':
      return Array.isArray(val) ? val.map(Number) : [];
    default:
      return val;
  }
}

export function marshalItem(obj: Record<string, unknown>): Record<string, AttributeValue> {
  const result: Record<string, AttributeValue> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = marshalValue(value);
    }
  }
  return result;
}

export function marshalValue(value: unknown): AttributeValue {
  if (value === null) return { NULL: true };
  if (typeof value === 'boolean') return { BOOL: value };
  if (typeof value === 'number') return { N: String(value) };
  if (typeof value === 'string') return { S: value };

  if (Array.isArray(value)) {
    return { L: value.map(marshalValue) };
  }

  if (typeof value === 'object') {
    return { M: marshalItem(value as Record<string, unknown>) };
  }

  return { S: String(value) };
}
