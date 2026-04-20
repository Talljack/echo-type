/**
 * Toast Notification Service
 * Centralized error and success message handling
 */
import Toast from 'react-native-toast-message';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastOptions {
  title: string;
  message?: string;
  duration?: number;
  position?: 'top' | 'bottom';
}

class ToastService {
  /**
   * Show success toast
   */
  success(options: ToastOptions) {
    Toast.show({
      type: 'success',
      text1: options.title,
      text2: options.message,
      visibilityTime: options.duration || 3000,
      position: options.position || 'top',
    });
  }

  /**
   * Show error toast
   */
  error(options: ToastOptions) {
    Toast.show({
      type: 'error',
      text1: options.title,
      text2: options.message,
      visibilityTime: options.duration || 4000,
      position: options.position || 'top',
    });
  }

  /**
   * Show info toast
   */
  info(options: ToastOptions) {
    Toast.show({
      type: 'info',
      text1: options.title,
      text2: options.message,
      visibilityTime: options.duration || 3000,
      position: options.position || 'top',
    });
  }

  /**
   * Show warning toast
   */
  warning(options: ToastOptions) {
    Toast.show({
      type: 'error', // Use error type for warnings (red color)
      text1: options.title,
      text2: options.message,
      visibilityTime: options.duration || 3500,
      position: options.position || 'top',
    });
  }

  /**
   * Hide current toast
   */
  hide() {
    Toast.hide();
  }

  /**
   * Show network error toast
   */
  networkError(message?: string) {
    this.error({
      title: 'Network Error',
      message: message || 'Please check your internet connection and try again.',
      duration: 4000,
    });
  }

  /**
   * Show generic error toast
   */
  genericError(message?: string) {
    this.error({
      title: 'Error',
      message: message || 'Something went wrong. Please try again.',
      duration: 3500,
    });
  }

  /**
   * Show validation error toast
   */
  validationError(message: string) {
    this.warning({
      title: 'Validation Error',
      message,
      duration: 3000,
    });
  }

  /**
   * Show permission error toast
   */
  permissionError(permission: string) {
    this.error({
      title: 'Permission Required',
      message: `Please grant ${permission} permission in Settings to use this feature.`,
      duration: 4000,
    });
  }
}

export const toast = new ToastService();
