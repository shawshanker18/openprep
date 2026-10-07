/** Mouse side buttons: MouseEvent.button 3 is "Back", 4 is "Forward". Returns -1 / 1 for those, 0 for everything else. */
export const mouseButtonDirection = (button: number): -1 | 0 | 1 => (button === 3 ? -1 : button === 4 ? 1 : 0);
