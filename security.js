/* Local, passphrase-derived encryption for saved records and sync files. */
let secureBlobExists = !!localStorage.getItem('cyj_secure_store');
let secureUnlocked = false;
let secureKey = null;
let securePassphrase = null;
let secureSalt = null;
let secureData = {};
let secureWriteQueue = Promise.resolve();
const secureNames = ['trips', 'expenses', 'bookings', 'invoiceCounter', 'customers', 'catalogItems', 'settings'];

const store = {
  get(key, fallback = []) {
    if (secureUnlocked) return secureData[key] ?? fallback;
    if (secureBlobExists) return fallback;
    try { return JSON.parse(localStorage.getItem('cab_' + key)) ?? fallback; }
    catch { return fallback; }
  },
  set(key, value) {
    if (secureUnlocked) {
      secureData[key] = JSON.parse(JSON.stringify(value));
      secureWriteQueue = secureWriteQueue.then(persistSecureData).catch(error => {
        console.error(error);
        if (window.toast) toast('Could not save encrypted data. Free device storage and try again.');
      });
      return;
    }
    if (secureBlobExists) return;
    localStorage.setItem('cab_' + key, JSON.stringify(value));
  }
};

function securityBytesToB64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}
const securityB64ToBytes = value => Uint8Array.from(atob(value), char => char.charCodeAt(0));

async function deriveSecurityKey(password, salt) {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 310000, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function sealSecurityObject(value, key = secureKey, salt = secureSalt) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plain = new TextEncoder().encode(JSON.stringify(value));
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plain);
  return {
    app: 'CreateYourJourney', encrypted: true, version: 1, iterations: 310000,
    salt: securityBytesToB64(salt), iv: securityBytesToB64(iv),
    ciphertext: securityBytesToB64(cipher)
  };
}

async function openSecurityObject(envelope, key) {
  if (!envelope || envelope.app !== 'CreateYourJourney' || envelope.encrypted !== true || envelope.version !== 1) {
    throw new Error('Not an encrypted CreateYourJourney file');
  }
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: securityB64ToBytes(envelope.iv) },
    key,
    securityB64ToBytes(envelope.ciphertext)
  );
  return JSON.parse(new TextDecoder().decode(plain));
}

async function persistSecureData() {
  if (!secureUnlocked) return;
  const envelope = await sealSecurityObject(secureData);
  localStorage.setItem('cyj_secure_store', JSON.stringify(envelope));
}

function collectOldData() {
  const data = {};
  for (const key of secureNames) {
    try {
      const raw = localStorage.getItem('cab_' + key);
      if (raw !== null) data[key] = JSON.parse(raw);
    } catch { /* Ignore an unreadable legacy entry; preserve the rest. */ }
  }
  return data;
}

function setSecurityError(message) { document.getElementById('securityError').textContent = message; }

function hydrateSecuredData() {
  trips = secureData.trips || [];
  expenses = secureData.expenses || [];
  bookings = secureData.bookings || [];
  customers = secureData.customers || [];
  catalogItems = secureData.catalogItems || [];
  settings = secureData.settings || {};
  invoiceCounter = Number(secureData.invoiceCounter) || 20;
  syncInvoiceNumbers();
  applySettings();
  render();
  runReport();
}

async function securitySubmit() {
  setSecurityError('');
  const password = document.getElementById('securityPassword').value;
  if (!password) { setSecurityError('Enter your passphrase.'); return; }
  const stored = localStorage.getItem('cyj_secure_store');
  try {
    if (stored) {
      const envelope = JSON.parse(stored);
      secureSalt = securityB64ToBytes(envelope.salt);
      const key = await deriveSecurityKey(password, secureSalt);
      secureData = await openSecurityObject(envelope, key);
      secureKey = key;
      securePassphrase = password;
      secureUnlocked = true;
      hydrateSecuredData();
      document.getElementById('securityGate').classList.add('hidden');
      document.getElementById('securityPassword').value = '';
      document.getElementById('securityConfirm').value = '';
      return;
    }
    if (password.length < 12) { setSecurityError('Choose a passphrase with at least 12 characters.'); return; }
    if (password !== document.getElementById('securityConfirm').value) { setSecurityError('The passphrases do not match.'); return; }

    secureSalt = crypto.getRandomValues(new Uint8Array(16));
    secureKey = await deriveSecurityKey(password, secureSalt);
    securePassphrase = password;
    secureData = collectOldData();
    Object.assign(secureData, { trips, expenses, bookings, invoiceCounter, customers, catalogItems, settings });
    const envelope = await sealSecurityObject(secureData);
    localStorage.setItem('cyj_secure_store', JSON.stringify(envelope));
    for (const key of secureNames) localStorage.removeItem('cab_' + key);
    secureBlobExists = true;
    secureUnlocked = true;
    document.getElementById('securityGate').classList.add('hidden');
    document.getElementById('securityPassword').value = '';
    document.getElementById('securityConfirm').value = '';
    toast('Passphrase set. Your saved records are encrypted.');
  } catch (error) {
    console.error(error);
    setSecurityError(stored
      ? 'That passphrase did not unlock the records. Try again.'
      : 'Could not encrypt the records. Free device storage and retry.');
  }
}

function securityCheck() {
  const exists = !!localStorage.getItem('cyj_secure_store');
  secureBlobExists = exists;
  document.getElementById('securityTitle').textContent = exists ? 'Unlock CreateYourJourney' : 'Protect your records';
  document.getElementById('securityDescription').textContent = exists
    ? 'Enter your passphrase to decrypt and open your saved records.'
    : 'Create a passphrase to encrypt records on this device and protect sync files.';
  document.getElementById('securityConfirm').classList.toggle('hidden', exists);
  document.getElementById('securitySubmit').textContent = exists ? 'Unlock' : 'Set passphrase';
  document.getElementById('securityPassword').focus();
}

async function lockSecureApp() {
  if (!secureBlobExists || !secureUnlocked) return;
  try { await secureWriteQueue; await persistSecureData(); }
  finally { secureKey = null; securePassphrase = null; secureSalt = null; secureData = {}; secureUnlocked = false; location.reload(); }
}

securityCheck();
