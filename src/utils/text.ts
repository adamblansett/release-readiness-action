/**
 * Text parsing and line calculation utilities.
 */

export interface LocationInfo {
  line: number;
  column: number;
  lineSnippet: string;
}

/**
 * Calculates 1-based line number, column number, and line snippet from a string character index.
 */
export function getLocationFromIndex(content: string, index: number): LocationInfo {
  if (index < 0 || index > content.length) {
    return { line: 1, column: 1, lineSnippet: '' };
  }

  const prefix = content.slice(0, index);
  const lines = prefix.split('\n');
  const line = lines.length;
  const lastLine = lines[lines.length - 1] ?? '';
  const column = lastLine.length + 1;

  // Extract full line containing index
  const startOfLine = prefix.lastIndexOf('\n') + 1;
  const endOfLine = content.indexOf('\n', index);
  const fullLine =
    endOfLine === -1 ? content.slice(startOfLine) : content.slice(startOfLine, endOfLine);

  return {
    line,
    column,
    lineSnippet: fullLine.trim(),
  };
}

/**
 * Safely truncates a string to maxLength bytes/characters with an indicator.
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength) + `... [truncated ${text.length - maxLength} chars]`;
}
