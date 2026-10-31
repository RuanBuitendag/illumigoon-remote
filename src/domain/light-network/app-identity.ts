const STORAGE_KEY = 'app-identity';

function newIdentity() {
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  return `app-${[...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

// A Lock names the phone that holds it, so this id must survive a restart of the app.
function loadIdentity() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return stored;
    const identity = newIdentity();
    localStorage.setItem(STORAGE_KEY, identity);
    return identity;
  } catch {
    return newIdentity();
  }
}

export const APP_IDENTITY = loadIdentity();
