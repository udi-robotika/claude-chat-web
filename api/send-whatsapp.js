const SHEETS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyeCAcrIHAjlTA1OWscBFT7rTXxbxQz7xanJl4hjXA2WceNfAzw5OA_Gch4wvfvyqU/exec';
const DEFAULT_PHONE_NUMBER_ID = '1177072588831725';

function normalizePhone(value) {
  return String(value || '').replace(/\D/g, '');
}

async function saveManualReply({ phone, text }) {
  const secret = process.env.GOOGLE_SHEETS_SECRET;
  if (!secret) return;

  const response = await fetch(SHEETS_WEB_APP_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      secret,
      messageId: `manual-${phone}-${Date.now()}`,
      name: '',
      phone,
      customerMessage: '',
      botReply: `👤 מענה ידני: ${text}`,
    }),
  });

  if (!response.ok) {
    throw new Error(`Google Sheets returned HTTP ${response.status}`);
  }

  const data = await response.json();
  if (!data.ok) {
    throw new Error(data.error || 'Google Sheets rejected the manual reply');
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const password = req.headers?.['x-admin-password'];
  if (!password || password !== process.env.WHATSAPP_VERIFY_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const phone = normalizePhone(req.body?.phone);
  const text = String(req.body?.text || '').trim();

  if (!/^\d{8,15}$/.test(phone)) {
    return res.status(400).json({ error: 'מספר הטלפון אינו תקין' });
  }
  if (!text) {
    return res.status(400).json({ error: 'יש לכתוב הודעה' });
  }
  if (text.length > 4096) {
    return res.status(400).json({ error: 'ההודעה ארוכה מדי' });
  }

  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || DEFAULT_PHONE_NUMBER_ID;

  if (!token) {
    return res.status(500).json({ error: 'WHATSAPP_TOKEN is not configured' });
  }

  try {
    const metaRes = await fetch(`https://graph.facebook.com/v25.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phone,
        type: 'text',
        text: { preview_url: false, body: text },
      }),
    });

    const metaData = await metaRes.json().catch(() => ({}));
    if (!metaRes.ok) {
      const message = metaData?.error?.message || 'Meta rejected the message';
      return res.status(metaRes.status).json({ error: message, details: metaData?.error || null });
    }

    try {
      await saveManualReply({ phone, text });
    } catch (error) {
      console.error('Manual reply log error:', error);
    }

    return res.status(200).json({ ok: true, messageId: metaData?.messages?.[0]?.id || null });
  } catch (error) {
    console.error('Manual WhatsApp send error:', error);
    return res.status(500).json({ error: 'לא ניתן לשלוח כרגע. נסה שוב בעוד רגע.' });
  }
}
