import * as H from 'expo-haptics';

let enabled = true;

/**
 * Called from the settings store on load/update so the user can turn all
 * haptic feedback off from Settings → Audio & Feedback.
 */
export function setHapticsEnabled(value: boolean) {
  enabled = value;
}

async function maybe<T>(fn: () => Promise<T>): Promise<void> {
  if (!enabled) return;
  await fn();
}

export const haptics = {
  tap: () => maybe(() => H.selectionAsync()),
  light: () => maybe(() => H.impactAsync(H.ImpactFeedbackStyle.Light)),
  medium: () => maybe(() => H.impactAsync(H.ImpactFeedbackStyle.Medium)),
  success: () => maybe(() => H.notificationAsync(H.NotificationFeedbackType.Success)),
  warning: () => maybe(() => H.notificationAsync(H.NotificationFeedbackType.Warning)),
  error: () => maybe(() => H.notificationAsync(H.NotificationFeedbackType.Error)),
};
