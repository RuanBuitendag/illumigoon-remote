// docs/DEVICE_LOCK.md section 5 in the firmware repo. The password never goes on the wire: a light
// stores SHA-256(password + device id), and a reclaim proves knowledge of it with an HMAC of the
// nonce from the heartbeat. This is a courtesy between housemates, not security.

const toHex = (bytes: ArrayBuffer) =>
  [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, '0')).join('');

const fromHex = (hex: string) => Uint8Array.from(hex.match(/../g) ?? [], (pair) => Number.parseInt(pair, 16));

const utf8 = (text: string) => new TextEncoder().encode(text);

export async function lockKey(password: string, deviceId: string) {
  return toHex(await crypto.subtle.digest('SHA-256', utf8(password + deviceId)));
}

export async function lockProof(key: string, nonce: string) {
  const hmac = { name: 'HMAC', hash: 'SHA-256' };
  const signingKey = await crypto.subtle.importKey('raw', fromHex(key), hmac, false, ['sign']);
  return toHex(await crypto.subtle.sign('HMAC', signingKey, utf8(nonce)));
}
