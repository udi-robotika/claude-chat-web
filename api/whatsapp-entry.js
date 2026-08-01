import originalWebhookHandler from './whatsapp-webhook.js';

const SHEETS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyeCAcrIHAjlTA1OWscBFT7rTXxbxQz7xanJl4hjXA2WceNfAzw5OA_Gch4wvfvyqU/exec';
const MANUAL_MODE_MARKER = '🔒 מצב ידני';
const BOT_MODE_MARKER = '🤖 מצב בוט';
const MANUAL_REPLY_PREFIX = '👤 מענה ידני:';

function normalizePhone(value) {
  return String(value || '').replace(/\D/g, '');
}

async function loadRows() {
  const secret = process.env.GOOGLE_SHEETS_SECRET;
  if (!secret) throw new Error('GOOGLE_SHEETS_SECRET is not configured');

  const url = new URL(SHEETS_WEB_APP_URL);
  url.searchParams.set('secret', secret);
  const response = await fetch(url, {
    headers: { accept: 'application/json' },
    cache: 'no-store',
  });

  if (!response.ok) throw new Error(`Google Sheets returned HTTP ${response.status}`);
  const data = await response.json();
  if (!data.ok) throw new Error(data.error || 'Google Sheets rejected the request');
  return data.rows || [];
}

function isManualMode(rows, phone) {
  const wantedPhone = normalizePhone(phone);
  let mode = 'bot';

  const matching = rows
    .filter((row) => normalizePhone(row.phone) === wantedPhone)
    .sort((a, b) => new Date(a.timestamp || a.time || 0) - new Date(b.timestamp || b.time || 0));

  for (const row of matching) {
    const reply = String(row.botReply || '').trim();
    if (reply.startsWith(BOT_MODE_MARKER)) mode = 'bot';
    if (reply.startsWith(MANUAL_MODE_MARKER) || reply.startsWith(MANUAL_REPLY_PREFIX)) mode = 'manual';
  }

  return mode === 'manual';
}

async function saveIncomingWithoutReply({ message, phone, text, name }) {
  const secret = process.env.GOOGLE_SHEETS_SECRET;
  if (!secret) throw new Error('GOOGLE_SHEETS_SECRET is not configured');

  const response = await fetch(SHEETS_WEB_APP_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      secret,
      messageId: message.id || `${phone}-${Date.now()}`,
      name,
      phone,
      customerMessage: text,
      botReply: '',
    }),
  });

  if (!response.ok) throw new Error(`Google Sheets returned HTTP ${response.status}`);
  const data = await response.json();
  if (!data.ok) throw new Error(data.error || 'Google Sheets rejected the conversation');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return originalWebhookHandler(req, res);
  }

  const value = req.body?.entry?.[0]?.changes?.[0]?.value;
  const message = value?.messages?.[0];

  if (!message || message.type !== 'text') {
    return originalWebhookHandler(req, res);
  }

  const phone = normalizePhone(message.from);
  const text = String(message.text?.body || '');
  const name = value?.contacts?.[0]?.profile?.name || '';

  try {
    const rows = await loadRows();
    if (!isManualMode(rows, phone)) {
      return originalWebhookHandler(req, res);
    }

    await saveIncomingWithoutReply({ message, phone, text, name });
    console.log('BOT SKIPPED: manual takeover is active', phone);
    return res.status(200).json({ ok: true, botReplySkipped: true, reason: 'manual-mode' });
  } catch (error) {
    // Safer behavior: if the mode cannot be checked, do not risk sending
    // an AI reply into a conversation that may be handled by a person.
    console.error('Manual takeover check failed:', error);
    try {
      await saveIncomingWithoutReply({ message, phone, text, name });
    } catch (saveError) {
      console.error('Could not save skipped incoming message:', saveError);
    }
    return res.status(200).json({ ok: true, botReplySkipped: true, reason: 'mode-check-failed' });
  }
}
