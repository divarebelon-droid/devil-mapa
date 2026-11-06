const esc = value => {
  const el = document.createElement('span');
  el.textContent = String(value || '');
  return el.innerHTML;
};

if (!document.querySelector('#clientPortalRoot')) {
  const root = document.createElement('main');
  root.id = 'clientPortalRoot';
  root.hidden = true;
  document.body.append(root);
}
if (!document.querySelector('#devilPortalStyles')) {
  const style = document.createElement('style');
  style.id = 'devilPortalStyles';
  style.textContent = `#clientPortalRoot{min-height:100vh;background:#11100f;color:#f4f1ee;padding:24px;font-family:inherit}.portal-shell{max-width:1180px;margin:auto}.portal-top{display:flex;align-items:center;gap:12px;padding:12px 0 22px;border-bottom:1px solid #393532}.portal-mark{display:grid;place-items:center;width:42px;height:42px;border-radius:14px;background:#d7a8ef;color:#17121b;font-size:23px}.portal-top small,.portal-top em{display:block;color:#b9a8c7;font-size:10px;letter-spacing:.15em}.portal-spacer{flex:1}.portal-top button,.portal-tabs button,.portal-post button{border:1px solid #514a54;border-radius:10px;background:#211e23;color:#f5eef8;padding:9px 13px;cursor:pointer}.portal-tabs{display:flex;gap:9px;margin:22px 0}.portal-tabs button.active{background:#d7a8ef;color:#201628}.portal-feed{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:20px}.portal-post,.portal-idea{overflow:hidden;border:1px solid #383238;border-radius:18px;background:#1c191d;padding:16px}.portal-post header{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}.portal-media{position:relative;display:grid;place-items:center;background:#0e0d0f;aspect-ratio:4/5;overflow:hidden;border-radius:12px}.portal-media img{width:100%;height:100%;object-fit:contain}.portal-art{white-space:pre-wrap;padding:12%;font-size:22px;line-height:1.2}.portal-prev,.portal-next{position:absolute;top:48%;font-size:22px}.portal-prev{left:7px}.portal-next{right:7px}.portal-dots{text-align:center;padding:8px}.portal-caption{white-space:pre-wrap;line-height:1.5}.portal-review{border-top:1px solid #383238;padding-top:12px}.portal-review textarea{display:block;box-sizing:border-box;width:100%;min-height:74px;margin:10px 0;background:#100f11;color:#f5f1f6;border:1px solid #514a54;border-radius:10px;padding:10px}.portal-review details{padding:10px 0;border-top:1px solid #39343b}.portal-comments p{padding:8px;border-left:2px solid #d7a8ef;background:#211e23;white-space:pre-wrap}.portal-ideas{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px}.portal-idea iframe{width:100%;height:430px;border:0;border-radius:12px}.portal-idea a{display:inline-block;margin-top:10px;color:#dfb5ff}.portal-empty{color:#b8b0b8}@media(max-width:640px){#clientPortalRoot{padding:12px}.portal-feed{grid-template-columns:1fr}.portal-top{flex-wrap:wrap}}`;
  document.head.append(style);
}

async function request(action, payload = {}, user = window.devilContents?.user) {
  const idToken = user ? await user.getIdToken() : '';
  const response = await fetch(window.devilContents.api, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    credentials: 'omit',
    body: JSON.stringify({ action, idToken, ...payload, requestId: crypto.randomUUID() })
  });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(result.error || 'N\u00e3o consegui abrir o espa\u00e7o da cliente.');
  return result;
}

async function checkEmail(email) {
  const address = String(email || '').trim().toLowerCase();
  if (address === 'divarebel.on@gmail.com') return { allowed: true, role: 'admin' };
  const result = await request('portalCheckEmail', { email: address }, null);
  return result;
}

function ideaCard(item) {
  const match = String(item.sourceUrl || '').match(/instagram\.com\/(p|reel|tv)\/([A-Za-z0-9_-]+)/i);
  const embed = match ? 'https://www.instagram.com/' + match[1] + '/' + match[2] + '/embed/' : '';
  return '<article class="portal-idea"><small>' + esc(item.collection || 'Ideia salva') + ' · ' + esc(item.status || 'nova ideia') +
    '</small><h3>' + esc(item.title || 'Referência do Instagram') + '</h3><p>' + esc(item.caption || '') +
    '</p>' + (embed ? '<iframe loading="lazy" src="' + esc(embed) + '" title="Publicação salva no Instagram"></iframe>' : '') +
    (item.sourceUrl ? '<a href="' + esc(item.sourceUrl) + '" target="_blank" rel="noopener">Abrir no Instagram ↗</a>' : '') + '</article>';
}

function postCard(item) {
  const slides = item.slides || [];
  const first = slides[0] || {};
  const art = first.imageDataUrl ? '<img src="' + esc(first.imageDataUrl) + '" alt="Arte para aprovação">' :
    '<div class="portal-art">' + esc([first.headline, first.text].filter(Boolean).join(' ') || item.title) + '</div>';
  return '<article class="portal-post"><header><b>' + esc(item.profileName || 'Perfil') + '</b><small>' +
    esc(item.format || 'Conteúdo') + '</small></header><div class="portal-media" data-index="0" data-slides="' +
    esc(JSON.stringify(slides)) + '">' + art + (slides.length > 1 ?
      '<button data-slide-step="-1" class="portal-prev">‹</button><button data-slide-step="1" class="portal-next">›</button>' : '') +
    '</div>' + (slides.length > 1 ? '<div class="portal-dots">' + slides.map((_, i) => i ? '○' : '●').join(' ') + '</div>' : '') +
    '<p class="portal-caption"><b>' + esc(item.profileName || '') + '</b> ' + esc(item.caption || item.title || '') +
    '</p><section class="portal-review"><label><input type="checkbox" data-portal-approve="' + esc(item.id) +
    '" ' + (item.approved ? 'checked' : '') + '> ' + (item.approved ? 'Aprovado' : 'Aprovar conteúdo') + '</label>' +
    '<div class="portal-comments">' + (item.comments || []).map(c => '<p>' + esc(c.text) + '</p>').join('') +
    '</div><textarea placeholder="Comente a publicação"></textarea><button data-portal-comment data-id="' + esc(item.id) +
    '" data-slide="">Enviar comentário</button>' + slides.map((slide, i) => '<details><summary>Comentar no slide ' +
    (i + 1) + '</summary><div class="portal-comments">' + (slide.comments || []).map(c => '<p>' + esc(c.text) + '</p>').join('') +
    '</div><textarea placeholder="O que devemos ajustar neste slide?"></textarea><button data-portal-comment data-id="' +
    esc(item.id) + '" data-slide="' + i + '">Enviar</button></details>').join('') + '</section></article>';
}

function render(data, target = document.querySelector('#clientPortalRoot'), preview = false) {
  if (!target) return;
  const name = data?.profileName || data?.client?.profileName || 'Seu perfil';
  const ideas = data?.ideas || [];
  const posts = data?.approvals || [];
  target.innerHTML = '<section class="portal-shell"><header class="portal-top"><b class="portal-mark">D</b>' +
    '<div><b>DEVIL CONTEÚDOS</b><small>ESPAÇO DA CLIENTE</small></div><span class="portal-spacer"></span><strong>' +
    esc(name) + '</strong>' + (preview ? '<em>PRÉVIA DA CLIENTE</em>' : '<button id="portalLogout">Sair</button>') +
    '</header><nav class="portal-tabs"><button class="active" data-portal-tab="posts">Aprovações <b>' + posts.length +
    '</b></button><button data-portal-tab="ideas">Banco de ideias <b>' + ideas.length + '</b></button></nav>' +
    '<section data-portal-page="posts"><p class="eyebrow">SEU FEED EM REVISÃO</p><h1>Conteúdos para aprovar</h1>' +
    '<div class="portal-feed">' + (posts.map(postCard).join('') || '<p class="portal-empty">Ainda não há conteúdos aqui.</p>') +
    '</div></section><section data-portal-page="ideas" hidden><p class="eyebrow">REFERÊNCIAS DA SUA PASTA</p>' +
    '<h1>Banco de ideias</h1><div class="portal-ideas">' + (ideas.map(ideaCard).join('') ||
    '<p class="portal-empty">Ainda não há ideias associadas ao seu perfil.</p>') + '</div></section></section>';
  target.querySelectorAll('[data-portal-tab]').forEach(button => button.onclick = () => {
    target.querySelectorAll('[data-portal-tab]').forEach(el => el.classList.toggle('active', el === button));
    target.querySelectorAll('[data-portal-page]').forEach(el => el.hidden = el.dataset.portalPage !== button.dataset.portalTab);
  });
  target.querySelectorAll('[data-slide-step]').forEach(button => button.onclick = () => {
    const box = button.closest('.portal-media'), slides = JSON.parse(box.dataset.slides || '[]');
    const index = Math.max(0, Math.min(slides.length - 1, Number(box.dataset.index || 0) + Number(button.dataset.slideStep)));
    box.dataset.index = index;
    const slide = slides[index];
    box.querySelector('img,.portal-art')?.remove();
    if (slide.imageDataUrl) { const img = document.createElement('img'); img.src = slide.imageDataUrl; box.prepend(img); }
    else { const art = document.createElement('div'); art.className = 'portal-art'; art.textContent = [slide.headline, slide.text].filter(Boolean).join('\n\n'); box.prepend(art); }
    box.parentElement.querySelector('.portal-dots').textContent = slides.map((_, i) => i === index ? '●' : '○').join(' ');
  });
  target.querySelectorAll('.portal-media').forEach(box => box.addEventListener('click', event => {
    if (event.target.closest('button')) return;
    const rect = box.getBoundingClientRect();
    box.dataset.anchor = Math.round((event.clientX - rect.left) / rect.width * 100) + '% x ' + Math.round((event.clientY - rect.top) / rect.height * 100) + '%';
    const index = Number(box.dataset.index || 0), details = box.closest('.portal-post')?.querySelectorAll('details')[index];
    if (details) { details.open = true; details.querySelector('summary').textContent = 'Slide ' + (index + 1) + ' - ponto marcado: ' + box.dataset.anchor; details.querySelector('textarea')?.focus(); }
  }));
  target.querySelectorAll('[data-portal-approve]').forEach(input => input.onchange = async () => {
    try { const result = await request('portalClientReview', { packageId: input.dataset.portalApprove, reviewAction: 'approve', approved: input.checked }); render(result.data, target, preview); }
    catch (error) { alert(error.message); input.checked = !input.checked; }
  });
  target.querySelectorAll('[data-portal-comment]').forEach(button => button.onclick = async () => {
    let text = button.parentElement.querySelector('textarea').value.trim();
    if (!text) return;
    if (button.dataset.slide !== '') { const media=button.closest('.portal-post')?.querySelector('.portal-media'),index=Number(button.dataset.slide); if(Number(media?.dataset.index||0)===index&&media?.dataset.anchor)text='[Ponto do design: '+media.dataset.anchor+'] '+text; }
    button.disabled = true;
    try {
      const result = await request('portalClientReview', {
        packageId: button.dataset.id, reviewAction: 'comment',
        slideIndex: button.dataset.slide === '' ? null : Number(button.dataset.slide), comment: text
      });
      render(result.data, target, preview);
    } catch (error) { alert(error.message); button.disabled = false; }
  });
  if (preview) target.querySelectorAll('input,textarea,button[data-portal-approve],button[data-portal-comment]').forEach(el => { el.disabled = true; });
  if (!preview) target.querySelector('#portalLogout')?.addEventListener('click', () => window.devilContents.signOut());
}

async function loadCustomer(user) {
  window.__devilPortalMode = true;
  window.devilContents.user = user;
  try {
    const result = await request('portalGet', {}, user);
    document.querySelector('.app').hidden = true;
    document.querySelector('#authGate').hidden = true;
    const root = document.querySelector('#clientPortalRoot');
    root.hidden = false;
    render({ ...result.data, profileName: result.profileName }, root);
  } catch (error) {
    await window.devilContents.signOut();
    document.querySelector('#authGate').hidden = false;
    document.querySelector('#authStatus').textContent = error.message;
  }
}

async function loadAdmin() {
  const result = await request('portalAdminList');
  return result.clients || [];
}

window.devilPortal = { checkEmail, loadCustomer, loadAdmin, render, request };
window.addEventListener('devil:data-ready', () => { window.__devilPortalMode = false; });
if (window.devilContents) window.devilContents.portalApi = request;

