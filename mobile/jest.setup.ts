const mockRouterMocks = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
};

jest.mock('expo-router', () => ({
  router: mockRouterMocks,
  useRouter: () => mockRouterMocks,
  useLocalSearchParams: () => ({}),
}));
