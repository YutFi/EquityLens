/**
 * True on iPhone, iPad and iPod, including iPadOS in its default "desktop" mode (which reports a
 * Mac user agent but has a touch screen). Used only to explain that features needing software on
 * a computer (the Moomoo bridge) cannot run on these devices.
 */
export function isIosDevice(nav: Pick<Navigator, 'userAgent' | 'maxTouchPoints'> | undefined = typeof navigator === 'undefined' ? undefined : navigator): boolean {
  if (!nav) return false;
  if (/iPhone|iPad|iPod/.test(nav.userAgent)) return true;
  return /Macintosh/.test(nav.userAgent) && (nav.maxTouchPoints ?? 0) > 1;
}
