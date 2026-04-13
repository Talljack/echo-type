import renderer from 'react-test-renderer';

import { MvpNoticeCard } from '@/components/ui/MvpNoticeCard';

it('renders the MVP notice card', () => {
  const tree = renderer.create(
    <MvpNoticeCard title="Local Demo" body="Runs without cloud sync." />,
  ).toJSON();

  expect(tree).toMatchSnapshot();
});
