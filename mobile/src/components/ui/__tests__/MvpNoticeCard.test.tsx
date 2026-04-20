import renderer, { act } from 'react-test-renderer';
import { MvpNoticeCard } from '../MvpNoticeCard';

describe('MvpNoticeCard', () => {
  it('renders title and body copy', () => {
    let tree;

    act(() => {
      tree = renderer
        .create(<MvpNoticeCard title="Local Tutor Demo" body="Responses are simulated in the mobile MVP." />)
        .toJSON();
    });

    expect(tree).toMatchSnapshot();
  });
});
