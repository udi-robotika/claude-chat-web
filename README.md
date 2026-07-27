# צ'אט עם קלוד - עמוד אינטרנט פשוט

עמוד אינטרנט עצמאי (לא WhatsApp) שמאפשר לדבר עם Claude דרך צ'אט בדפדפן.

## איך זה בנוי

- `index.html` - עמוד הצ'אט (HTML/CSS/JS פשוט, ללא תלויות).
- `api/chat.js` - פונקציית שרת (Vercel Serverless Function) שמחזיקה את מפתח ה-API ומעבירה בקשות ל-Claude. **המפתח לעולם לא נחשף לדפדפן.**

## שלב 1: להעלות ל-GitHub

1. היכנס ל-https://github.com/new וצור ריפו חדש (למשל `claude-chat-web`). אפשר Public או Private.
2. אל תבחר "Add README" (יש לנו כבר אחד).
3. לאחר יצירת הריפו, לחץ על "uploading an existing file" (או גרור את כל התיקייה הזו) והעלה את כל הקבצים:
   - `index.html`
   - `api/chat.js`
   - `package.json`
   - `.gitignore`
   - `.env.example`
   - `README.md`
4. Commit.

(אם נוח לך יותר עם Git בטרמינל: `git init`, `git add .`, `git commit -m "chat app"`, `git remote add origin <URL>`, `git push -u origin main`.)

## שלב 2: לפרוס ב-Vercel (חינם)

1. היכנס ל-https://vercel.com והתחבר עם חשבון ה-GitHub שלך.
2. "Add New" → "Project" → בחר את הריפו `claude-chat-web`.
3. לפני הלחיצה על Deploy, פתח "Environment Variables" והוסף:
   - Key: `ANTHROPIC_API_KEY`
   - Value: המפתח שלך מ-console.anthropic.com
4. לחץ Deploy.
5. בסיום תקבל כתובת כמו `https://claude-chat-web.vercel.app` - זה העמוד שלך, חי באוויר.

## הערות חשובות

- **המפתח בטוח**: הוא נשמר כמשתנה סביבה בשרת של Vercel, אף פעם לא נכתב בקוד שרץ בדפדפן.
- **זיכרון שיחה**: השיחה נשמרת רק בזיכרון הדפדפן (משתנה JS). רענון עמוד = שיחה חדשה. אם תרצה שהיסטוריה תישמר גם אחרי רענון, אפשר להוסיף בהמשך שמירה ב-localStorage או במסד נתונים.
- **מודל**: כרגע מוגדר `claude-sonnet-5`. אפשר לשנות ב-`api/chat.js`.
- **עלות**: אין עלות לאחסון ב-Vercel בשימוש קל. תשלום הוא רק על קריאות ל-Claude API לפי השימוש בפועל.

## הרצה מקומית (אופציונלי)

אם מותקן Node.js ו-Vercel CLI (`npm i -g vercel`):

```
vercel dev
```

וליצור קובץ `.env` (מבוסס על `.env.example`) עם המפתח האמיתי, מקומית בלבד - אל תעלה אותו ל-GitHub (הוא כבר ב-`.gitignore`).
