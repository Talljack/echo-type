/**
 * Accessibility Utilities
 * Helpers for improving app accessibility
 */

/**
 * Minimum touch target size (44x44pt for iOS, 48x48dp for Android)
 */
export const MIN_TOUCH_TARGET_SIZE = 44;

/**
 * Create accessible label for screen readers
 */
export function createAccessibilityLabel(parts: (string | undefined | null)[]): string {
  return parts.filter(Boolean).join(', ');
}

/**
 * Create accessible hint for screen readers
 */
export function createAccessibilityHint(action: string, result?: string): string {
  if (result) {
    return `${action}. ${result}`;
  }
  return action;
}

/**
 * Get role description for custom components
 */
export function getRoleDescription(role: string): string {
  const roleDescriptions: Record<string, string> = {
    card: 'Card',
    chip: 'Chip',
    tab: 'Tab',
    'tab-bar': 'Tab Bar',
    modal: 'Modal Dialog',
    drawer: 'Navigation Drawer',
    'bottom-sheet': 'Bottom Sheet',
    toast: 'Notification',
    badge: 'Badge',
    avatar: 'Avatar',
    divider: 'Divider',
  };

  return roleDescriptions[role] || role;
}

/**
 * Format progress for screen readers
 */
export function formatProgressForA11y(current: number, total: number): string {
  const percentage = Math.round((current / total) * 100);
  return `${percentage} percent complete, ${current} of ${total}`;
}

/**
 * Format time for screen readers
 */
export function formatTimeForA11y(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`);
  if (minutes > 0) parts.push(`${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs} ${secs === 1 ? 'second' : 'seconds'}`);

  return parts.join(', ');
}

/**
 * Format date for screen readers
 */
export function formatDateForA11y(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Check if color contrast meets WCAG AA standards
 * Returns true if contrast ratio is >= 4.5:1 for normal text
 */
export function meetsContrastRequirement(foreground: string, background: string, largeText: boolean = false): boolean {
  const ratio = getContrastRatio(foreground, background);
  const minRatio = largeText ? 3 : 4.5;
  return ratio >= minRatio;
}

/**
 * Calculate contrast ratio between two colors
 */
function getContrastRatio(color1: string, color2: string): number {
  const l1 = getRelativeLuminance(color1);
  const l2 = getRelativeLuminance(color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Get relative luminance of a color
 */
function getRelativeLuminance(color: string): number {
  const rgb = hexToRgb(color);
  if (!rgb) return 0;

  const [r, g, b] = rgb.map((val) => {
    const normalized = val / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): [number, number, number] | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : null;
}

/**
 * Announce message to screen reader
 * Uses AccessibilityInfo.announceForAccessibility on React Native
 */
export function announceForAccessibility(message: string) {
  // This will be implemented with AccessibilityInfo in React Native
  // For now, just log in development
  if (__DEV__) {
    console.log('[A11y Announcement]', message);
  }
}

/**
 * Check if screen reader is enabled
 */
export async function isScreenReaderEnabled(): Promise<boolean> {
  // This will be implemented with AccessibilityInfo.isScreenReaderEnabled
  // For now, return false
  return false;
}

/**
 * Accessibility state helpers
 */
export const a11yState = {
  disabled: (disabled: boolean) => ({ disabled }),
  selected: (selected: boolean) => ({ selected }),
  checked: (checked: boolean) => ({ checked }),
  busy: (busy: boolean) => ({ busy }),
  expanded: (expanded: boolean) => ({ expanded }),
};

/**
 * Common accessibility props for buttons
 */
export function getButtonA11yProps(label: string, hint?: string, disabled?: boolean) {
  return {
    accessibilityRole: 'button' as const,
    accessibilityLabel: label,
    accessibilityHint: hint,
    accessibilityState: disabled ? { disabled: true } : undefined,
  };
}

/**
 * Common accessibility props for links
 */
export function getLinkA11yProps(label: string, hint?: string) {
  return {
    accessibilityRole: 'link' as const,
    accessibilityLabel: label,
    accessibilityHint: hint,
  };
}

/**
 * Common accessibility props for text inputs
 */
export function getTextInputA11yProps(label: string, value: string, required?: boolean, error?: string) {
  return {
    accessibilityLabel: required ? `${label}, required` : label,
    accessibilityValue: { text: value },
    accessibilityHint: error || undefined,
  };
}

/**
 * Common accessibility props for switches
 */
export function getSwitchA11yProps(label: string, checked: boolean, hint?: string) {
  return {
    accessibilityRole: 'switch' as const,
    accessibilityLabel: label,
    accessibilityHint: hint,
    accessibilityState: { checked },
  };
}

/**
 * Common accessibility props for checkboxes
 */
export function getCheckboxA11yProps(label: string, checked: boolean, hint?: string) {
  return {
    accessibilityRole: 'checkbox' as const,
    accessibilityLabel: label,
    accessibilityHint: hint,
    accessibilityState: { checked },
  };
}

/**
 * Common accessibility props for radio buttons
 */
export function getRadioA11yProps(label: string, selected: boolean, hint?: string) {
  return {
    accessibilityRole: 'radio' as const,
    accessibilityLabel: label,
    accessibilityHint: hint,
    accessibilityState: { selected },
  };
}

/**
 * Common accessibility props for tabs
 */
export function getTabA11yProps(label: string, selected: boolean, index: number, total: number) {
  return {
    accessibilityRole: 'tab' as const,
    accessibilityLabel: `${label}, ${index + 1} of ${total}`,
    accessibilityState: { selected },
  };
}

/**
 * Common accessibility props for progress bars
 */
export function getProgressA11yProps(current: number, total: number, label?: string) {
  return {
    accessibilityRole: 'progressbar' as const,
    accessibilityLabel: label,
    accessibilityValue: {
      min: 0,
      max: total,
      now: current,
      text: formatProgressForA11y(current, total),
    },
  };
}
