/** Capacitor로 감싼 네이티브 앱(iOS 등)에서 실행 중인지 여부. */
export function isNativeApp(): boolean {
  return typeof window !== 'undefined' && Boolean((window as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.());
}
