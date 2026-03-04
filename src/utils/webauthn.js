/**
 * WebAuthn PRF for passkey-based unlock (fingerprint, Windows Hello, etc.).
 * Uses @simplewebauthn/browser for registration and buffer helpers; PRF auth uses raw get() for binary salt.
 */

import {
  startRegistration,
  browserSupportsWebAuthn,
  base64URLStringToBuffer,
  bufferToBase64URLString,
} from '@simplewebauthn/browser';

const S3HAIM_PRF_INFO = new TextEncoder().encode('S3 Haim Master Password Wrap V1');
const WEB_AUTHN_STORAGE_KEY = 's3NotesWebAuthn';

function bufToBase64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function base64ToBuf(b64) {
  return Uint8Array.from(atob(b64), (c) => c.charCode(0)).buffer;
}

function getRpId() {
  if (typeof window === 'undefined' || !window.location?.hostname) return 'localhost';
  return window.location.hostname;
}

function randomBytes(length) {
  return crypto.getRandomValues(new Uint8Array(length));
}

function challengeBase64URL() {
  return bufferToBase64URLString(randomBytes(32));
}

export async function isWebAuthnPRFSupported() {
  if (!(await browserSupportsWebAuthn())) return false;
  if (!window.PublicKeyCredential || typeof PublicKeyCredential.getClientCapabilities !== 'function') return false;
  try {
    const caps = await PublicKeyCredential.getClientCapabilities('public-key');
    return caps?.extensions?.includes?.('prf') === true;
  } catch {
    return false;
  }
}

/**
 * Derive AES-GCM key from PRF 32-byte output using HKDF.
 */
async function deriveWrapKey(prfOutput) {
  const masterKey = await crypto.subtle.importKey(
    'raw',
    prfOutput,
    'HKDF',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      salt: new Uint8Array(0),
      hash: 'SHA-256',
      info: S3HAIM_PRF_INFO,
    },
    masterKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/**
 * Create a passkey with PRF enabled via @simplewebauthn/browser.
 * Returns credentialId (base64url) and salt (base64) for later get().
 */
export async function createPasskeyWithPRF() {
  const rpId = getRpId();
  const challenge = challengeBase64URL();
  const userId = bufferToBase64URLString(randomBytes(16));
  const salt = randomBytes(32);

  const optionsJSON = {
    rp: { name: 'S3 Haim', id: rpId },
    user: {
      id: userId,
      name: 's3haim@local',
      displayName: 'S3 Haim User',
    },
    challenge,
    pubKeyCredParams: [
      { type: 'public-key', alg: -7 },
      { type: 'public-key', alg: -257 },
    ],
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'required',
      authenticatorAttachment: 'platform',
    },
    extensions: {
      prf: {},
    },
  };

  const credential = await startRegistration({ optionsJSON });
  const prfOut = credential?.clientExtensionResults?.prf;
  if (!prfOut?.enabled) throw new Error('이 기기에서 PRF(지문/보안 키 암호화)를 지원하지 않습니다.');

  return {
    credentialId: credential.rawId,
    salt: bufToBase64(salt),
  };
}

/**
 * Get PRF-derived key via getAssertion. Uses raw navigator.credentials.get so we can pass binary salt.
 */
export async function getPasskeyPRFKey(credentialId, saltBase64) {
  const rpId = getRpId();
  const challenge = randomBytes(32);
  const salt = typeof saltBase64 === 'string' ? new Uint8Array(base64ToBuf(saltBase64)) : saltBase64;

  const getOptions = {
    publicKey: {
      rpId,
      challenge,
      allowCredentials: [
        {
          type: 'public-key',
          id: base64URLStringToBuffer(credentialId),
        },
      ],
      userVerification: 'required',
      extensions: {
        prf: {
          eval: {
            first: salt,
          },
        },
      },
    },
  };

  const assertion = await navigator.credentials.get(getOptions);
  if (!assertion) throw new Error('보안 키 인증에 실패했습니다.');
  const prfResults = assertion.getClientExtensionResults?.()?.prf?.results?.first;
  if (!prfResults) throw new Error('PRF 결과를 가져올 수 없습니다.');
  return prfResults;
}

/**
 * Wrap (encrypt) master password with PRF-derived key. Returns { iv, ciphertext } base64.
 */
export async function wrapPasswordWithPRFKey(prfKeyOutput, password) {
  const key = await deriveWrapKey(prfKeyOutput);
  const iv = randomBytes(12);
  const encoded = new TextEncoder().encode(password);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded,
  );
  return {
    iv: bufToBase64(iv),
    ciphertext: bufToBase64(ciphertext),
  };
}

/**
 * Unwrap (decrypt) master password with PRF-derived key.
 */
export async function unwrapPasswordWithPRFKey(prfKeyOutput, wrapped) {
  const key = await deriveWrapKey(prfKeyOutput);
  const iv = base64ToBuf(wrapped.iv);
  const ciphertext = base64ToBuf(wrapped.ciphertext);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext,
  );
  return new TextDecoder().decode(decrypted);
}

export function getStoredWebAuthn() {
  try {
    const raw = localStorage.getItem(WEB_AUTHN_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data?.credentialId || !data?.salt || !data?.encryptedPassword) return null;
    return data;
  } catch {
    return null;
  }
}

export function setStoredWebAuthn(data) {
  if (!data) {
    localStorage.removeItem(WEB_AUTHN_STORAGE_KEY);
    return;
  }
  localStorage.setItem(WEB_AUTHN_STORAGE_KEY, JSON.stringify(data));
}

/**
 * Enable WebAuthn: create passkey, get PRF key, wrap current master password, store.
 */
export async function enableWebAuthnUnlock(masterPassword) {
  const { credentialId, salt } = await createPasskeyWithPRF();
  const prfKey = await getPasskeyPRFKey(credentialId, salt);
  const encryptedPassword = await wrapPasswordWithPRFKey(prfKey, masterPassword);
  setStoredWebAuthn({ credentialId, salt, encryptedPassword });
}

/**
 * Unlock using WebAuthn: get assertion with PRF, derive key, unwrap password, return it.
 */
export async function unlockWithWebAuthn() {
  const stored = getStoredWebAuthn();
  if (!stored) throw new Error('등록된 보안 키가 없습니다.');
  const prfKey = await getPasskeyPRFKey(stored.credentialId, stored.salt);
  return unwrapPasswordWithPRFKey(prfKey, stored.encryptedPassword);
}

export function disableWebAuthnUnlock() {
  setStoredWebAuthn(null);
}

/**
 * When user changes master password, update the wrapped password so WebAuthn still works.
 */
export async function updateWebAuthnWrappedPassword(newMasterPassword) {
  const stored = getStoredWebAuthn();
  if (!stored) return;
  const prfKey = await getPasskeyPRFKey(stored.credentialId, stored.salt);
  const encryptedPassword = await wrapPasswordWithPRFKey(prfKey, newMasterPassword);
  setStoredWebAuthn({ ...stored, encryptedPassword });
}
