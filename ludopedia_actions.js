const { chromium } = require('playwright');

const EMAIL    = 'gala.alt911@gmail.com';
const PASSWORD = 'claude123claude';

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Textos ──────────────────────────────────────────────────────────────────────

const NOVO_TOPICO_TITULO = 'Fiz uma versão web do ITO para jogar em festas sem o baralho físico';

const NOVO_TOPICO_CORPO = `Sempre fui fã do ITO físico, mas num churrasco percebi que tinha esquecido o baralho em casa.
O grupo queria jogar de qualquer forma, então na mesma noite fiz uma versão web que roda no celular de cada um.

Como funciona: cada jogador abre o link no celular e recebe um número secreto. O host define um Tema Espectral ("1 = pior superpoder / 100 = melhor superpoder") e cada um dá uma pista baseada na intensidade do seu número. O grupo debate, ordena os celulares na mesa do menor pro maior e revela tudo ao mesmo tempo — exatamente como no jogo físico, só que sem as cartas.

Fica bem fiel à mecânica original da Grail Games. Os temas espectrais estão em português (mais de 70 disponíveis), inglês e espanhol — o jogo detecta o idioma do navegador automaticamente.

Para quem quiser testar: jogo-ito.vercel.app (funciona direto no celular, sem cadastro e sem download)

Alguém aqui já tinha tentado fazer algo parecido? Fico curioso pra saber como o grupo reage quando joga digital vs físico.`;

const REPLY_NOVOS_TEMAS = `Adorei o compilado do danilopinotti2! Contribuindo com mais alguns temas que testamos aqui:

Cotidiano Absurdo
1 = Acordar às 5h numa segunda-feira / 100 = Acordar naturalmente sem alarme num sábado

Tecnologia
1 = Internet caindo na hora da reunião / 100 = Wi-Fi 5G em qualquer lugar do planeta

Comida
1 = Abrir a geladeira e não ter nada / 100 = Churrasco pronto esperando você em casa

Trabalho
1 = Reunião que poderia ser um e-mail / 100 = Feriado caindo numa sexta-feira

Nostalgia
1 = Perder o save do jogo / 100 = Encontrar R$50 num bolso de roupa que você não usava

---

PS: Como não encontrei versão digital oficial, acabei fazendo uma versão web pra jogar quando a turma esquece o baralho físico: jogo-ito.vercel.app — funciona no celular sem cadastro. Tem todos esses temas novos integrados!`;

// Helper: set textarea + Froala editor content via JS
async function setEditorContent(page, selector, text) {
  return await page.evaluate(({ sel, txt }) => {
    const ta = document.querySelector(sel);
    if (!ta) return false;
    // Set raw textarea value
    ta.value = txt;
    ta.dispatchEvent(new Event('change', { bubbles: true }));
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    // Also set Froala contenteditable if present
    const ce = ta.closest('.fr-box, form')
      ? (ta.closest('.fr-box, form').querySelector('.fr-element[contenteditable="true"]') ||
         document.querySelector('.fr-element[contenteditable="true"]'))
      : document.querySelector('.fr-element[contenteditable="true"]');
    if (ce) ce.innerHTML = txt.replace(/\n/g, '<br>');
    return true;
  }, { sel: selector, txt: text });
}

// ── Main ────────────────────────────────────────────────────────────────────────

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36',
    locale: 'pt-BR'
  });
  const page = await context.newPage();

  // ── 1. Login ────────────────────────────────────────────────────────────────
  console.log('🔐 Fazendo login na Ludopedia...');
  await page.goto('https://ludopedia.com.br', { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(1500);

  // Abre o modal Bootstrap de login via JS
  await page.evaluate(() => { if (typeof $ !== 'undefined') $('#modal-login').modal('show'); });
  await sleep(1000);

  // Preenche campos do modal via JS (password field é name="pass" não name="password")
  await page.evaluate((creds) => {
    const modal = document.querySelector('#modal-login');
    if (!modal) return;
    const emailEl = modal.querySelector('input[name="email"]');
    const passEl  = modal.querySelector('input[name="pass"]');
    if (emailEl) { emailEl.value = creds.email; emailEl.dispatchEvent(new Event('input', { bubbles: true })); }
    if (passEl)  { passEl.value  = creds.pass;  passEl.dispatchEvent(new Event('input', { bubbles: true })); }
  }, { email: EMAIL, pass: PASSWORD });
  await sleep(300);

  // Submete o form do modal via JS
  await page.evaluate(() => {
    const modal = document.querySelector('#modal-login');
    const form = modal && modal.querySelector('form');
    if (form) form.submit();
  });
  await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
  await sleep(2000);

  const url = page.url();
  const loggedIn = !url.includes('/login') && !url.includes('erro');
  console.log(loggedIn ? '✅ Login OK — ' + url : '❌ Login falhou — ' + url);

  if (!loggedIn) {
    const err = await page.textContent('.alert, .erro, .error, #mensagem').catch(() => '');
    if (err) console.log('   Mensagem:', err.trim().substring(0, 200));
    await browser.close();
    process.exit(1);
  }

  // ── 2. Novo Tópico no Fórum do ITO ─────────────────────────────────────────
  // URL correta: forum_post?id_jogo=57964 (ID numérico do ITO)
  console.log('\n📝 Criando novo tópico no fórum do ITO...');
  await page.goto('https://ludopedia.com.br/forum_post?id_jogo=57964', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await sleep(2000);
  console.log('   URL:', page.url(), '| Título:', await page.title());

  // Preenche o título (campo visível)
  await page.fill('input[name="titulo"]', NOVO_TOPICO_TITULO);
  console.log('   ✅ Título preenchido');
  await sleep(300);

  // Preenche o corpo via JS (textarea está oculto atrás do Froala editor)
  const bodyOk = await setEditorContent(page, 'textarea[name="mensagem"]', NOVO_TOPICO_CORPO);
  console.log('   ' + (bodyOk ? '✅' : '⚠️') + ' Corpo preenchido via JS: ' + bodyOk);
  await sleep(500);

  // Screenshot antes de submeter
  await page.screenshot({ path: 'ludopedia_before_submit.png' });

  // Submete o form do novo tópico
  await page.evaluate(() => {
    const form = document.querySelector('form[action*="forum_post"], form[method="post"], #form-post, form');
    const forms = document.querySelectorAll('form');
    // Pega o form que tem o campo titulo
    for (const f of forms) {
      if (f.querySelector('input[name="titulo"]')) { f.submit(); return; }
    }
  });
  await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
  await sleep(2000);

  const newUrl = page.url();
  console.log('   Resultado:', newUrl);
  if (newUrl.includes('topico') || newUrl.includes('forum_post')) {
    await page.screenshot({ path: 'ludopedia_topico_result.png' });
    const pageText = await page.textContent('body').catch(() => '');
    const hasError = pageText.toLowerCase().includes('erro') || pageText.toLowerCase().includes('captcha');
    if (hasError) {
      console.log('   ⚠️ Possível erro ou CAPTCHA. Screenshot: ludopedia_topico_result.png');
    } else {
      console.log('   ✅ Tópico criado com sucesso:', newUrl);
    }
  } else {
    await page.screenshot({ path: 'ludopedia_topico_result.png' });
    console.log('   ⚠️ URL inesperada. Screenshot: ludopedia_topico_result.png');
  }

  // ── 3. Reply no tópico "Novos Temas" ───────────────────────────────────────
  console.log('\n💬 Postando reply em "Novos Temas"...');
  await page.goto('https://ludopedia.com.br/topico/83202/ito-novos-temas', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await sleep(2000);
  console.log('   URL:', page.url());

  // O campo de reply tem id=resposta e name=mensagem (oculto atrás do Froala)
  const replyOk = await setEditorContent(page, 'textarea#resposta, textarea[name="mensagem"]', REPLY_NOVOS_TEMAS);
  console.log('   ' + (replyOk ? '✅' : '⚠️') + ' Texto de reply preenchido via JS: ' + replyOk);

  if (!replyOk) {
    await page.screenshot({ path: 'ludopedia_reply_debug.png' });
    console.log('   Screenshot: ludopedia_reply_debug.png');
  } else {
    await sleep(500);
    // Submete o form de reply
    await page.evaluate(() => {
      const forms = document.querySelectorAll('form');
      for (const f of forms) {
        // Form de reply tem textarea com id=resposta
        if (f.querySelector('textarea#resposta, textarea[name="mensagem"]')) { f.submit(); return; }
      }
    });
    await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
    await sleep(2000);
    const replyUrl = page.url();
    console.log('   Resultado:', replyUrl);
    await page.screenshot({ path: 'ludopedia_reply_result.png' });
    const bodyText = await page.textContent('body').catch(() => '');
    const hasError = bodyText.toLowerCase().includes('captcha') || bodyText.toLowerCase().includes('erro');
    if (hasError) {
      console.log('   ⚠️ Possível CAPTCHA ou erro. Screenshot: ludopedia_reply_result.png');
    } else {
      console.log('   ✅ Reply enviada:', replyUrl);
    }
  }

  await browser.close();
  console.log('\n✅ Script concluído.');
})();
