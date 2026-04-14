# Error Handling System - Usage Guide

## Overview

The error handling system provides:
- **ErrorBoundary**: Catches React errors and displays fallback UI
- **Toast Service**: Centralized success/error/info/warning notifications
- **Error Utilities**: Custom error classes, validation, retry logic, logging

## Components

### 1. ErrorBoundary

Wraps the entire app in `app/_layout.tsx` to catch unhandled React errors.

```tsx
<ErrorBoundary>
  <App />
</ErrorBoundary>
```

**Features:**
- Catches component errors during render, lifecycle, and event handlers
- Shows user-friendly error message
- Displays error details in development mode
- Provides "Try Again" button to reset error state
- Logs errors to console (and external service in production)

**Custom Fallback:**
```tsx
<ErrorBoundary
  fallback={(error, resetError) => (
    <CustomErrorScreen error={error} onRetry={resetError} />
  )}
>
  <MyComponent />
</ErrorBoundary>
```

### 2. Toast Service

Centralized notification system using `react-native-toast-message`.

**Import:**
```tsx
import { toast } from '@/lib/toast';
```

**Basic Usage:**
```tsx
// Success
toast.success({
  title: 'Success',
  message: 'Content saved successfully',
});

// Error
toast.error({
  title: 'Error',
  message: 'Failed to save content',
  duration: 4000,
});

// Info
toast.info({
  title: 'Info',
  message: 'Processing your request...',
});

// Warning
toast.warning({
  title: 'Warning',
  message: 'This action cannot be undone',
});
```

**Convenience Methods:**
```tsx
// Network error
toast.networkError();
toast.networkError('Custom message');

// Generic error
toast.genericError();
toast.genericError('Custom message');

// Validation error
toast.validationError('Please fill in all required fields');

// Permission error
toast.permissionError('microphone');
```

**Hide Toast:**
```tsx
toast.hide();
```

### 3. Error Classes

Custom error types for better error handling.

```tsx
import {
  AppError,
  NetworkError,
  ValidationError,
  AuthError,
  PermissionError,
  NotFoundError,
} from '@/lib/errors';

// Throw custom errors
throw new ValidationError('Email is required');
throw new NetworkError('Failed to fetch data');
throw new AuthError('Invalid credentials');
throw new PermissionError('Camera access denied');
throw new NotFoundError('Content not found');

// With details
throw new ValidationError('Invalid input', {
  field: 'email',
  value: 'invalid-email',
});
```

### 4. Error Utilities

**Check Error Type:**
```tsx
import { isNetworkError, isAuthError } from '@/lib/errors';

try {
  await fetchData();
} catch (error) {
  if (isNetworkError(error)) {
    toast.networkError();
  } else if (isAuthError(error)) {
    // Redirect to login
  } else {
    toast.genericError();
  }
}
```

**Get Error Message:**
```tsx
import { getErrorMessage } from '@/lib/errors';

try {
  await doSomething();
} catch (error) {
  const message = getErrorMessage(error);
  toast.error({ title: 'Error', message });
}
```

**Log Error:**
```tsx
import { logError } from '@/lib/errors';

try {
  await riskyOperation();
} catch (error) {
  logError(error, 'MyComponent.riskyOperation');
  toast.genericError();
}
```

**Async Error Handler:**
```tsx
import { handleAsync } from '@/lib/errors';

const [data, error] = await handleAsync(
  fetchData(),
  (err) => toast.networkError()
);

if (error) {
  // Handle error
  return;
}

// Use data
console.log(data);
```

**Retry with Backoff:**
```tsx
import { retryAsync } from '@/lib/errors';

const data = await retryAsync(
  () => fetchData(),
  {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    shouldRetry: isNetworkError,
  }
);
```

**Validation:**
```tsx
import { validateRequired, validateEmail, validateUrl } from '@/lib/errors';

// Validate required fields
try {
  validateRequired(formData, ['name', 'email', 'password']);
} catch (error) {
  toast.validationError(error.message);
}

// Validate email
if (!validateEmail(email)) {
  toast.validationError('Invalid email format');
}

// Validate URL
if (!validateUrl(url)) {
  toast.validationError('Invalid URL format');
}
```

## Usage Examples

### Example 1: Form Submission

```tsx
import { toast } from '@/lib/toast';
import { ValidationError, logError, getErrorMessage } from '@/lib/errors';

const handleSubmit = async () => {
  setLoading(true);
  try {
    // Validate
    if (!email.trim()) {
      throw new ValidationError('Email is required');
    }
    if (!password.trim()) {
      throw new ValidationError('Password is required');
    }

    // Submit
    await submitForm({ email, password });

    toast.success({
      title: 'Success',
      message: 'Form submitted successfully',
    });
    
    onSuccess();
  } catch (error) {
    logError(error, 'FormComponent.handleSubmit');

    if (error instanceof ValidationError) {
      toast.validationError(error.message);
    } else {
      toast.error({
        title: 'Submission Failed',
        message: getErrorMessage(error),
      });
    }
  } finally {
    setLoading(false);
  }
};
```

### Example 2: API Call with Retry

```tsx
import { toast } from '@/lib/toast';
import { retryAsync, isNetworkError, logError } from '@/lib/errors';

const fetchContent = async () => {
  setLoading(true);
  try {
    const data = await retryAsync(
      () => api.getContent(id),
      {
        maxRetries: 3,
        shouldRetry: isNetworkError,
      }
    );

    setContent(data);
  } catch (error) {
    logError(error, 'ContentScreen.fetchContent');

    if (isNetworkError(error)) {
      toast.networkError();
    } else {
      toast.genericError();
    }
  } finally {
    setLoading(false);
  }
};
```

### Example 3: Permission Request

```tsx
import { toast } from '@/lib/toast';
import { PermissionError, logError } from '@/lib/errors';
import * as Permissions from 'expo-permissions';

const requestMicrophonePermission = async () => {
  try {
    const { status } = await Permissions.askAsync(Permissions.AUDIO_RECORDING);

    if (status !== 'granted') {
      throw new PermissionError('Microphone permission denied');
    }

    // Permission granted, proceed
    startRecording();
  } catch (error) {
    logError(error, 'SpeakScreen.requestMicrophonePermission');

    if (error instanceof PermissionError) {
      toast.permissionError('microphone');
    } else {
      toast.genericError();
    }
  }
};
```

### Example 4: File Upload

```tsx
import { toast } from '@/lib/toast';
import { NetworkError, logError, getErrorMessage } from '@/lib/errors';

const uploadFile = async (file: File) => {
  setUploading(true);
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new NetworkError(`Upload failed: ${response.statusText}`);
    }

    const data = await response.json();

    toast.success({
      title: 'Upload Complete',
      message: 'File uploaded successfully',
    });

    return data;
  } catch (error) {
    logError(error, 'FileUpload.uploadFile');

    if (isNetworkError(error)) {
      toast.networkError('Upload failed. Please check your connection.');
    } else {
      toast.error({
        title: 'Upload Failed',
        message: getErrorMessage(error),
      });
    }
  } finally {
    setUploading(false);
  }
};
```

### Example 5: Async Operation with handleAsync

```tsx
import { toast } from '@/lib/toast';
import { handleAsync, isNetworkError } from '@/lib/errors';

const loadData = async () => {
  setLoading(true);

  const [data, error] = await handleAsync(
    fetchDataFromAPI(),
    (err) => {
      if (isNetworkError(err)) {
        toast.networkError();
      } else {
        toast.genericError();
      }
    }
  );

  setLoading(false);

  if (error) {
    return;
  }

  setData(data);
};
```

## Best Practices

### 1. Always Log Errors
```tsx
catch (error) {
  logError(error, 'ComponentName.methodName');
  // ... handle error
}
```

### 2. Use Specific Error Types
```tsx
// Good
throw new ValidationError('Email is required');

// Avoid
throw new Error('Email is required');
```

### 3. Provide Context
```tsx
logError(error, 'ImportModal.handleImport');
toast.error({
  title: 'Import Failed',
  message: 'Failed to import content from URL',
});
```

### 4. Handle Different Error Types
```tsx
catch (error) {
  if (error instanceof ValidationError) {
    toast.validationError(error.message);
  } else if (isNetworkError(error)) {
    toast.networkError();
  } else if (isAuthError(error)) {
    // Redirect to login
  } else {
    toast.genericError();
  }
}
```

### 5. Don't Swallow Errors
```tsx
// Bad
catch (error) {
  // Silent failure
}

// Good
catch (error) {
  logError(error, 'context');
  toast.genericError();
}
```

### 6. Use Toast for User Feedback
```tsx
// Success feedback
toast.success({ title: 'Saved', message: 'Changes saved successfully' });

// Error feedback
toast.error({ title: 'Error', message: 'Failed to save changes' });

// Info feedback
toast.info({ title: 'Processing', message: 'Please wait...' });
```

## Integration Checklist

- [x] ErrorBoundary wraps app in `_layout.tsx`
- [x] Toast component added to `_layout.tsx`
- [x] Toast config imported and applied
- [x] ImportModal updated to use toast and error utilities
- [ ] Update all API calls to use error handling
- [ ] Update all form submissions to use validation
- [ ] Update all permission requests to use error handling
- [ ] Add error handling to practice modules
- [ ] Add error handling to sync operations

## Testing

### Test Error Boundary
```tsx
// Throw error in component to test ErrorBoundary
const BuggyComponent = () => {
  throw new Error('Test error');
  return <View />;
};
```

### Test Toast
```tsx
// In any component
<Button onPress={() => toast.success({ title: 'Test', message: 'Toast works!' })}>
  Test Toast
</Button>
```

### Test Error Utilities
```tsx
// Test validation
try {
  validateRequired({ name: '' }, ['name', 'email']);
} catch (error) {
  console.log(error.message); // "Missing required fields: name, email"
}

// Test retry
const data = await retryAsync(() => fetchData(), { maxRetries: 3 });
```

## Future Enhancements

1. **Error Tracking Service Integration**
   - Sentry, Bugsnag, or similar
   - Automatic error reporting in production
   - User context and breadcrumbs

2. **Offline Error Queue**
   - Queue errors when offline
   - Sync when connection restored

3. **Error Analytics**
   - Track error frequency
   - Identify problematic areas
   - Monitor error trends

4. **User Feedback**
   - Allow users to report errors
   - Attach screenshots
   - Collect additional context
