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

  it('marks unbuilt features as planned, not available', async () => {
    window.location.hash = '#/events';
    render(<App />);
    await waitFor(() => expect(screen.getAllByText(/planned/i).length).toBeGreaterThan(0));
    expect(screen.getAllByText(/no free licensed/i).length).toBeGreaterThan(0);
  });

  it.each(['valuation', 'forecasting', 'opportunities', 'screener', 'comparison', 'sectors', 'simulator', 'watchlist'])(
    'renders the %s page with an honest empty state when nothing is loaded',
    async (route) => {
      window.location.hash = `#/${route}`;
      render(<App />);
      await waitFor(() => expect(screen.getAllByText(/no companies with data yet|no simulated portfolio yet|no watchlist yet/i).length).toBeGreaterThan(0));
    },
  );

  it('runs every analysis page on synthetic demo data without crashing', async () => {
    window.location.hash = '#/settings';
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole('button', { name: /load synthetic demo data/i }));
    for (const route of ['opportunities', 'screener', 'sectors', 'valuation', 'comparison']) {
      window.location.hash = `#/${route}`;
      await waitFor(() => expect(screen.queryAllByText(/no companies with data yet/i)).toHaveLength(0), { timeout: 4000 });
    }
    window.location.hash = '#/forecasting';
    expect(await screen.findByText(/A statistical scenario, not a prediction/i)).toBeInTheDocument();
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
