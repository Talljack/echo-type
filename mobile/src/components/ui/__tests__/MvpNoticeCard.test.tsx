import renderer, { act } from 'react-test-renderer';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { MvpNoticeCard } from '../MvpNoticeCard';

describe('MvpNoticeCard', () => {
  it('renders title and body copy', () => {
    let tree;

    act(() => {
      tree = renderer
        .create(
          <ThemeProvider>
            <MvpNoticeCard title="Local Tutor Demo" body="Responses are simulated in the mobile MVP." />
          </ThemeProvider>,
        )
        .toJSON();
    });

    expect(tree).toMatchSnapshot();
  });
});
