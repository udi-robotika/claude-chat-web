const SHEETS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyeCAcrIHAjlTA1OWscBFT7rTXxbxQz7xanJl4hjXA2WceNfAzw5OA_Gch4wvfvyqU/exec';
const MODE_MARKERS = {
  manual: '🔒 מצב ידני',
  bot: '🤖 מצב בוט',
};

function normalizePhone(value) {
  return String(value || '').replace(/\D/g, '');
}

async function saveMode(phone, mode) {
  const secret = process.env.GOOGLE_SHEETS_SECRET;
  if (!secret) throw new Error('GOOGLE_SHEETS_SECRET is not configured');

  const response = await fetch(SHEETS_WEB_APP_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      secret,
      messageId: `mode-${mode}-${phone}-${Date.now()}`,
      name: '',
      phone,
      customerMessage: '',
      botReply: MODE_MARKERS[mode],
    }),
  });

  if (!response.ok) throw new Error(`Google Sheets returned HTTP ${response.status}`);
  const data = await response.json();
  if (!data.ok) throw new Error(data.error || 'Google Sheets rejected the mode change');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const password = req.headers?.['x-admin-password'];
  if (!password || password !== process.env.WHATSAPP_VERIFY_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const phone = normalizePhone(req.body?.phone);
  const mode = String(req.body?.mode || '');
  if (!/^\d{8,15}$/.test(phone)) return res.status(400).json({ error: 'מספר הטלפון אינו תקין' });
  if (!MODE_MARKERS[mode]) return res.status(400).json({ error: 'מצב השיחה אינו תקין' });

  try {
    await saveMode(phone, mode);
    return res.status(200).json({ ok: true, mode });
  } catch (error) {
    console.error('Conversation mode error:', error);
    return res.status(500).json({ error: 'לא ניתן לשנות כרגע את מצב השיחה' });
  }
}
