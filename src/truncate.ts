/** Shortens `input` to at most `max` characters, ending with an ellipsis when cut. */
export function truncate(input: string, max: number): string {
  if (input.length <= max) return input;
  return input.slice(0, max) + '…';
}
