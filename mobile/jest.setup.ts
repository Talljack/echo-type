const mockRouterMocks = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
};

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  router: mockRouterMocks,
  useRouter: () => mockRouterMocks,
  useLocalSearchParams: () => ({}),
}));

beforeEach(() => {
  jest.clearAllMocks();
});
