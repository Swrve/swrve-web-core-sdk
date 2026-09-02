const MAX_SAFE_INTEGER_TEXT = "9007199254740991";
const PRESERVED_INTEGER_KEYS = new Set(["message_id", "variant_id"]);

export function parseJsonPreservingLargeIds(text: string): any {
  return JSON.parse(quoteUnsafeIntegerIds(text));
}

function quoteUnsafeIntegerIds(text: string): string {
  let result = "";
  let index = 0;

  while (index < text.length) {
    if (text[index] !== '"') {
      result += text[index++];
      continue;
    }

    const stringEnd = findStringEnd(text, index);
    const token = text.slice(index, stringEnd + 1);
    result += token;
    index = stringEnd + 1;

    const key = JSON.parse(token) as string;
    if (!PRESERVED_INTEGER_KEYS.has(key)) {
      continue;
    }

    const colonIndex = skipWhitespace(text, index);
    if (text[colonIndex] !== ":") {
      continue;
    }

    const valueStart = skipWhitespace(text, colonIndex + 1);
    const valueEnd = findIntegerEnd(text, valueStart);
    if (valueEnd === valueStart) {
      continue;
    }

    const integer = text.slice(valueStart, valueEnd);
    if (!isUnsafeInteger(integer)) {
      continue;
    }

    result += text.slice(index, valueStart) + `"${integer}"`;
    index = valueEnd;
  }

  return result;
}

function findStringEnd(text: string, start: number): number {
  let escaped = false;
  for (let index = start + 1; index < text.length; index++) {
    const character = text[index];
    if (character === '"' && !escaped) {
      return index;
    }
    escaped = character === "\\" && !escaped;
    if (character !== "\\") {
      escaped = false;
    }
  }
  return text.length - 1;
}

function skipWhitespace(text: string, start: number): number {
  let index = start;
  while (index < text.length && /\s/.test(text[index])) {
    index++;
  }
  return index;
}

function findIntegerEnd(text: string, start: number): number {
  let index = start;
  if (text[index] === "-") {
    index++;
  }
  const digitsStart = index;
  while (index < text.length && text[index] >= "0" && text[index] <= "9") {
    index++;
  }
  return index === digitsStart ? start : index;
}

function isUnsafeInteger(integer: string): boolean {
  const absolute = integer[0] === "-" ? integer.slice(1) : integer;
  const normalized = absolute.replace(/^0+/, "") || "0";
  return normalized.length > MAX_SAFE_INTEGER_TEXT.length ||
    (normalized.length === MAX_SAFE_INTEGER_TEXT.length &&
      normalized > MAX_SAFE_INTEGER_TEXT);
}
