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
export declare function getLocationFromIndex(content: string, index: number): LocationInfo;
/**
 * Safely truncates a string to maxLength bytes/characters with an indicator.
 */
export declare function truncateText(text: string, maxLength: number): string;
//# sourceMappingURL=text.d.ts.map