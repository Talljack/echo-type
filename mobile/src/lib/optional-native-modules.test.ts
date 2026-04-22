describe('optional native modules', () => {
  let infoSpy: jest.SpyInstance;

  beforeEach(() => {
    infoSpy = jest.spyOn(console, 'info').mockImplementation(() => undefined);
  });

  afterEach(() => {
    infoSpy.mockRestore();
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('returns netinfo when native module is available', () => {
    const addEventListener = jest.fn();
    const fetch = jest.fn();

    jest.doMock('@react-native-community/netinfo', () => ({
      __esModule: true,
      default: { addEventListener, fetch },
    }));

    const { getOptionalNetInfoModule } = require('./optional-native-modules') as typeof import('./optional-native-modules');

    expect(getOptionalNetInfoModule()).toEqual({ addEventListener, fetch });
  });

  it('returns null when netinfo native module is unavailable', () => {
    jest.doMock('@react-native-community/netinfo', () => {
      throw new Error('Native module missing');
    });

    const { getOptionalNetInfoModule } = require('./optional-native-modules') as typeof import('./optional-native-modules');

    expect(getOptionalNetInfoModule()).toBeNull();
    expect(infoSpy).toHaveBeenCalledWith(
      'NetInfo native module unavailable, falling back to online-first behavior.',
      expect.any(Error),
    );
  });

  it('returns sharing module when native module is available', () => {
    const isAvailableAsync = jest.fn();
    const shareAsync = jest.fn();

    jest.doMock('expo-sharing', () => ({
      __esModule: true,
      isAvailableAsync,
      shareAsync,
    }));

    const { getOptionalSharingModule } = require('./optional-native-modules') as typeof import('./optional-native-modules');

    expect(getOptionalSharingModule()).toMatchObject({ isAvailableAsync, shareAsync });
  });

  it('returns null when sharing native module is unavailable', () => {
    jest.doMock('expo-sharing', () => {
      throw new Error('Native module missing');
    });

    const { getOptionalSharingModule } = require('./optional-native-modules') as typeof import('./optional-native-modules');

    expect(getOptionalSharingModule()).toBeNull();
    expect(infoSpy).toHaveBeenCalledWith(
      'ExpoSharing native module unavailable, export will stay local only.',
      expect.any(Error),
    );
  });
});
