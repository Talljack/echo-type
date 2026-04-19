jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(),
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

import * as Haptics from 'expo-haptics';
import { haptics, setHapticsEnabled } from './haptics';

describe('haptics semantic API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setHapticsEnabled(true);
  });

  it('tap → selectionAsync', async () => {
    await haptics.tap();
    expect(Haptics.selectionAsync).toHaveBeenCalled();
  });

  it('light → impactAsync light', async () => {
    await haptics.light();
    expect(Haptics.impactAsync).toHaveBeenCalledWith('light');
  });

  it('medium → impactAsync medium', async () => {
    await haptics.medium();
    expect(Haptics.impactAsync).toHaveBeenCalledWith('medium');
  });

  it('success → notificationAsync success', async () => {
    await haptics.success();
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');
  });

  it('warning → notificationAsync warning', async () => {
    await haptics.warning();
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('warning');
  });

  it('error → notificationAsync error', async () => {
    await haptics.error();
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('error');
  });

  it('skips all calls when disabled', async () => {
    setHapticsEnabled(false);
    await haptics.tap();
    await haptics.light();
    await haptics.medium();
    await haptics.success();
    await haptics.warning();
    await haptics.error();
    expect(Haptics.selectionAsync).not.toHaveBeenCalled();
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
    expect(Haptics.notificationAsync).not.toHaveBeenCalled();
  });
});
