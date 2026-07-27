// Vercel Serverless Function
// מקבל היסטוריית שיחה מהדפדפן, שולח ל-Claude API, ומחזיר את התשובה.
// המפתח (ANTHROPIC_API_KEY) נשמר כמשתנה סביבה בצד השרת ולעולם לא נחשף לדפדפן.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'חסר משתנה סביבה ANTHROPIC_API_KEY בשרת' });
  }

  const { messages } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages is required' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 1024,
        system: 'אתה קלוד, עוזר ידידותי שעונה בעברית כברירת מחדל אלא אם המשתמש כותב בשפה אחרת.',
        messages,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error || data });
    }

    const text = (data.content || []).map((c) => c.text || '').join('');
    return res.status(200).json({ text });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
