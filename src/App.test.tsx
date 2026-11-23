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

  it('offers the Moomoo bridge in Settings and rejects addresses that are not on this computer', async () => {
    window.location.hash = '#/settings';
    const user = userEvent.setup();
    render(<App />);
    expect(await screen.findByText(/Moomoo local bridge/i)).toBeInTheDocument();
    const box = screen.getByLabelText(/bridge address/i);
    await user.clear(box);
    await user.type(box, 'http://example.com');
    await waitFor(() => expect(box).toHaveAttribute('aria-invalid', 'true'));
    expect(screen.getByRole('button', { name: /test connection/i })).toBeDisabled();
  });

  it('shows no Moomoo controls on a company page until the bridge is enabled', async () => {
    window.location.hash = '#/settings';
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole('button', { name: /load synthetic demo data/i }));
    // Demo data lives in memory only (jsdom has no IndexedDB), so move between pages without remounting the app.
    window.location.hash = '#/company/XKLS%3ADEMO1';
    expect(await screen.findByRole('button', { name: /replace price history/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /fetch from moomoo bridge/i })).not.toBeInTheDocument();

    window.location.hash = '#/settings';
    await screen.findByText(/Moomoo local bridge/i);
    localStorage.setItem('equitylens.moomoo.bridge', JSON.stringify({ enabled: true, url: 'http://127.0.0.1:8765' }));
    const fetchMock = vi.fn(async (_url: string) => new Response(JSON.stringify({ source: 'mock', price: 5.5, prevClose: 5.4, time: '2099-01-02 10:00:00' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    try {
      window.location.hash = '#/company/XKLS%3ADEMO1';
      expect(await screen.findByRole('button', { name: /fetch from moomoo bridge/i })).toBeInTheDocument();
      expect(fetchMock).not.toHaveBeenCalled();                       // nothing is requested until Live is switched on
      await user.click(screen.getByRole('button', { name: /^live quote$/i }));
      expect(await screen.findByText(/MOCK quote \(synthetic\)/i)).toBeInTheDocument();
      expect(fetchMock.mock.calls[0][0]).toBe('http://127.0.0.1:8765/quote?code=DEMO1');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('explains on iPhone that the Moomoo bridge cannot run there, and disables its controls', async () => {
    const spy = vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1');
    try {
      window.location.hash = '#/settings';
      render(<App />);
      expect(await screen.findByText(/not available on iphone or ipad/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/use the moomoo bridge/i)).toBeDisabled();
      expect(screen.getByRole('button', { name: /test connection/i })).toBeDisabled();
    } finally {
      spy.mockRestore();
    }
  });
});
