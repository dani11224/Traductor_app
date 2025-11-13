export async function ltTranslate({
  text, to, from = 'auto',
}: { text: string; to: string; from?: string }) {
  const base = process.env.EXPO_PUBLIC_LT_URL!;
  const apiKey = process.env.EXPO_PUBLIC_LT_API_KEY!;
  // troceo conservador
  const paras = String(text).split(/\n{2,}/g);
  const chunks: string[] = [];
  let box = '';
  for (const p of paras) {
    const cand = box ? box + '\n\n' + p : p;
    if (cand.length > 1800) { if (box) chunks.push(box); box = p; }
    else box = cand;
  }
  if (box) chunks.push(box);

  const out: string[] = [];
  for (const c of chunks) {
    if (!c.trim()) continue;
    const body = new URLSearchParams();
    body.set('q', c);
    body.set('source', from);
    body.set('target', to);
    body.set('format', 'text');
    body.set('api_key', apiKey);

    const r = await fetch(`${base}/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (!r.ok) {
      const msg = await r.text().catch(() => '');
      throw new Error(`LibreTranslate ${r.status} ${msg}`);
    }
    const data = await r.json(); // { translatedText }
    out.push(data.translatedText ?? '');
  }
  return out.join('\n\n');
}
