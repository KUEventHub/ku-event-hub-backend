export function getMissingAttributeString(attribute: string): string {
  return `Missing attribute: '${attribute}'`;
}

export function getInvalidValueString(attribute: string): string {
  return `{VALUE} is not '${attribute}'`;
}

export function getDuplicateValueString(attribute: string): string {
  return `'${attribute}' already exists`;
}

export function getMinimumLengthString(
  attribute: string,
  length: number
): string {
  return `'${attribute}' must be at least ${length} character(s), got {VALUE}`;
}

export function getMaximumLengthString(
  attribute: string,
  length: number
): string {
  return `'${attribute}' must be at most ${length} character(s), got {VALUE}`;
}

export function getMinimumValueString(
  attribute: string,
  value: number
): string {
  return `'${attribute}' must be at least ${value}, got {VALUE}`;
}
