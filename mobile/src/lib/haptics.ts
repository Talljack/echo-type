import * as H from 'expo-haptics';

export const haptics = {
  tap: () => H.selectionAsync(),
  light: () => H.impactAsync(H.ImpactFeedbackStyle.Light),
  medium: () => H.impactAsync(H.ImpactFeedbackStyle.Medium),
  success: () => H.notificationAsync(H.NotificationFeedbackType.Success),
  warning: () => H.notificationAsync(H.NotificationFeedbackType.Warning),
  error: () => H.notificationAsync(H.NotificationFeedbackType.Error),
};
