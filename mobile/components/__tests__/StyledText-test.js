import renderer, { act } from 'react-test-renderer';

import { MvpNoticeCard } from '@/components/ui/MvpNoticeCard';

it('renders the MVP notice card', () => {
  let testRenderer;

  act(() => {
    testRenderer = renderer.create(
      <MvpNoticeCard title="Local Demo" body="Runs without cloud sync." />,
    );
  });

  const tree = testRenderer.toJSON();

  expect(tree).toMatchSnapshot();
});
