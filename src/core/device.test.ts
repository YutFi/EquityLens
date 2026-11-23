import { isIosDevice } from './device';

describe('isIosDevice', () => {
  const iphone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
  const mac = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';
  it('recognises iPhone and iPad user agents', () => {
    expect(isIosDevice({ userAgent: iphone, maxTouchPoints: 5 })).toBe(true);
    expect(isIosDevice({ userAgent: 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X)', maxTouchPoints: 5 })).toBe(true);
  });
  it('recognises iPadOS reporting a Mac user agent, but not a real Mac', () => {
    expect(isIosDevice({ userAgent: mac, maxTouchPoints: 5 })).toBe(true);
    expect(isIosDevice({ userAgent: mac, maxTouchPoints: 0 })).toBe(false);
  });
  it('is false for Windows, Android and unknown environments', () => {
    expect(isIosDevice({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130', maxTouchPoints: 0 })).toBe(false);
    expect(isIosDevice({ userAgent: 'Mozilla/5.0 (Linux; Android 14) Chrome/130 Mobile', maxTouchPoints: 5 })).toBe(false);
    expect(isIosDevice(undefined)).toBe(false);
  });
});
