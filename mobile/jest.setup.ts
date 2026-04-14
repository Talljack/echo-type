jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  },
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
}));

jest.mock('react-native-paper', () => {
  const { Text } = require('react-native');

  return {
    Text,
  };
});

jest.mock('react-test-renderer', () => {
  const actual = jest.requireActual('react-test-renderer');

  return {
    ...actual,
    create(element, options) {
      let instance;

      actual.act(() => {
        instance = actual.create(element, options);
      });

      return instance;
    },
  };
});
