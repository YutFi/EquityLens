export const DISCLAIMER =
  'EquityLens is an independent financial research and educational platform. Financial information, calculations, assessments and forecasts are provided for informational purposes only. Historical performance does not guarantee future results. Forecasts are estimates based on available data and assumptions and may be inaccurate. Nothing on this platform constitutes personalised financial advice or a recommendation to buy or sell any financial instrument. Users are responsible for conducting their own research and making independent investment decisions.';

export function Disclaimer() {
  return (
    <footer className="footer">
      <p><b>Disclaimer.</b> {DISCLAIMER}</p>
      <p>
        Open source (MIT) · No accounts, no tracking, no subscriptions · Your data stays in this browser ·{' '}
        Charts by <a href="https://www.tradingview.com/" target="_blank" rel="noreferrer noopener">TradingView Lightweight Charts™</a>.
      </p>
    </footer>
  );
}
