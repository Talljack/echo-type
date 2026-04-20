import { jest } from '@jest/globals';
import { Text as mockText } from 'react-native';
import renderer, { act } from 'react-test-renderer';

import { MvpNoticeCard } from '@/components/ui/MvpNoticeCard';

jest.mock('react-native-paper', () => ({
  Text: mockText,
}));

it('renders the MVP notice card', () => {
  let testRenderer;

  act(() => {
    testRenderer = renderer.create(<MvpNoticeCard title="Local Demo" body="Runs without cloud sync." />);
  });

  const tree = testRenderer.toJSON();

  expect(tree).toMatchSnapshot();
});
