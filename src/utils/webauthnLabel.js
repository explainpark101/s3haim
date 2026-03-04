/**
 * 환경(User-Agent)에 따른 WebAuthn/생체인증 버튼 라벨.
 * Windows Hello, Touch ID, 생체 인식 등.
 */
export function getWebAuthnEncryptLabel() {
  if (typeof navigator === 'undefined' || !navigator.userAgent) return '보안 키';
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('windows') || ua.includes('win32')) return 'Windows Hello';
  if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('mac')) return 'Touch ID';
  if (ua.includes('android')) return '생체 인식';
  return '보안 키';
}
