import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';

// jsdom has no canvas, so the charting library cannot run here.
vi.mock('./components/PriceChart', () => ({ PriceChart: () => <div data-testid="chart" /> }));

beforeEach(() => {
  window.location.hash = '#/';
  localStorage.clear();
});

describe('App smoke test', () => {
  it('renders the shell with the required disclaimer and an honest empty state', async () => {
    render(<App />);
    expect(await screen.findAllByText(/Nothing on this platform constitutes personalised financial advice/i)).not.toHaveLength(0);
    expect(screen.getAllByText(/Overview/).length).toBeGreaterThan(0);
  });

  it('marks planned features as planned, not available', async () => {
    window.location.hash = '#/valuation';
    render(<App />);
    await waitFor(() => expect(screen.getAllByText(/planned/i).length).toBeGreaterThan(0));
  });

  it('explains data sources honestly', async () => {
    window.location.hash = '#/data-sources';
    render(<App />);
    expect(await screen.findByText(/Honest status of live data/i)).toBeInTheDocument();
  });

  it('loads synthetic demo data from Settings and labels it', async () => {
    window.location.hash = '#/settings';
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole('button', { name: /load synthetic demo data/i }));
    await user.click(screen.getAllByRole('link', { name: /Overview/i })[0]);
    expect((await screen.findAllByText(/demo/i)).length).toBeGreaterThan(0);
  });
});
