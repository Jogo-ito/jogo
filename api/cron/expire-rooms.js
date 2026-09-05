// Vercel Cron Job — chama expire_stale_rooms() periodicamente pelo servidor.
// Existe porque o mecanismo original (RPC disparado no window.onload do cliente)
// depende de alguém abrir o jogo; se o service worker de um visitante ficar
// preso numa versao antiga, esse visitante nunca dispara o RPC. Isso deixou
// 1.028 salas travadas em esperando/sorteado sem expirar entre 06/2026 e 09/2026.
// Agendado em vercel.json ("crons"). Usa a mesma anon key ja publica no client.

const SUPABASE_URL = 'https://zatuzblawpfumwxzkfpu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InphdHV6Ymxhd3BmdW13eHprZnB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NDE4NzEsImV4cCI6MjA4ODUxNzg3MX0.jKkfclscnkGk2SocjfCI9q5QVGBpSjxEzR07PXhdeHo';

export default async function handler(req, res) {
  if (process.env.CRON_SECRET && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }

  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/expire_stale_rooms`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
    });

    if (!r.ok) {
      const text = await r.text();
      return res.status(502).json({ ok: false, error: text });
    }

    const affected = await r.json();
    return res.status(200).json({ ok: true, affected });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
}
