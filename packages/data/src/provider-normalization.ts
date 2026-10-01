const JSON_NUMBER = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y;

function plainDecimal(value: string): string {
  const exponentAt = value.search(/[eE]/);
  if (exponentAt < 0) return value;
  const coefficient = value.slice(0, exponentAt);
  const exponent = Number(value.slice(exponentAt + 1));
  if (!Number.isSafeInteger(exponent) || Math.abs(exponent) > 100) return value;
  const negative = coefficient.startsWith('-');
  const unsigned = negative ? coefficient.slice(1) : coefficient;
  const decimalAt = unsigned.indexOf('.');
  const digits = unsigned.replace('.', '');
  const point = (decimalAt < 0 ? unsigned.length : decimalAt) + exponent;
  const expanded =
    point <= 0
      ? `0.${'0'.repeat(-point)}${digits}`
      : point >= digits.length
        ? `${digits}${'0'.repeat(point - digits.length)}`
        : `${digits.slice(0, point)}.${digits.slice(point)}`;
  return `${negative ? '-' : ''}${expanded}`;
}

// Preserve provider decimal tokens as text so prices never pass through binary floating point.
export function parseExactJson(input: string): unknown {
  let output = '';
  let inString = false;
  let escaped = false;

  for (let index = 0; index < input.length;) {
    const character = input[index];
    if (character === undefined) break;
    if (inString) {
      output += character;
      index += 1;
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') {
      inString = true;
      output += character;
      index += 1;
      continue;
    }

    if (character === '-' || /\d/.test(character)) {
      JSON_NUMBER.lastIndex = index;
      const match = JSON_NUMBER.exec(input);
      if (match !== null) {
        output += JSON.stringify(plainDecimal(match[0]));
        index = JSON_NUMBER.lastIndex;
        continue;
      }
    }

    output += character;
    index += 1;
  }

  return JSON.parse(output) as unknown;
}

export const decimalTextPattern = /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/;
export const unsignedDecimalTextPattern = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;

export function parseProviderDate(input: string): Date | undefined {
  const match = /^(\d{1,2})[-./](\d{1,2})[-./](\d{4})$/.exec(input.trim());
  if (match === null) {
    const parsed = new Date(input);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return undefined;
  }
  return date;
}
