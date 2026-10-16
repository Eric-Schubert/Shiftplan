/**
 * The text between person and shift of an audit entry. Without a shift (an absence over days in
 * different shifts) it loses its trailing mark, so the line reads "Anna Weber absent · week 42".
 */
export function entrySeparator(separator: string, hasShift: boolean): string {
  return hasShift ? separator : separator.replace(/[\s·→✕]+$/u, "");
}
