import * as H from 'expo-haptics';

let enabled = true;

/**
 * Called from the settings store on load/update so the user can turn all
 * haptic feedback off from Settings → Audio & Feedback.
 */
export function setHapticsEnabled(value: boolean) {
  enabled = value;
}

const skipIfDisabled = <T>(fn: () => Promise<T>): Promise<T | void> => (enabled ? fn() : Promise.resolve());

export const haptics = {
  tap: () => skipIfDisabled(() => H.selectionAsync()),
  light: () => skipIfDisabled(() => H.impactAsync(H.ImpactFeedbackStyle.Light)),
  medium: () => skipIfDisabled(() => H.impactAsync(H.ImpactFeedbackStyle.Medium)),
  success: () => skipIfDisabled(() => H.notificationAsync(H.NotificationFeedbackType.Success)),
  warning: () => skipIfDisabled(() => H.notificationAsync(H.NotificationFeedbackType.Warning)),
  error: () => skipIfDisabled(() => H.notificationAsync(H.NotificationFeedbackType.Error)),
};
