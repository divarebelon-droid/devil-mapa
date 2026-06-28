/**
 * DEVIL Mapa — Atualizador de dados para GitHub Actions
 * Busca tarefas do ClickUp (ambos os espaços) e reuniões do cache Granola
 * e gera graph-data.json atualizado.
 * Roda em Node.js sem dependências externas.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const CLICKUP_TOKEN = process.env.CLICKUP_API_TOKEN || process.env.CLICKUP_API_KEY;

const LISTAS = [
  { id: '901316452690', perfil: 'oficina_dro',  nome: 'Conteúdo Oficina' },
  { id: '901317125138', perfil: 'oficina_dro',  nome: 'CRM Oficina' },
  { id: '901315882544', perfil: 'divarebel.on', nome: 'Conteúdo Diva Rebel' },
  { id: '901315882685', perfil: 'divarebel.on', nome: 'Infoprodutos' },
  { id: '901323905877', perfil: 'divarebel.on', nome: 'Central Campanha SM' },
  { id: '901326921632', perfil: 'divarebel.on', nome: 'CRM DEVIL CHAT' },
];

function hoje() { return new Date().toISOString().split('T')[0]; }
function uid(p)  { return `${p}-${Date.now()}-${Math.random().toString(36).slice(2,6)}`; }

function fetchJson(url, headers) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('JSON parse: ' + data.slice(0, 200))); }
      });
    });
    req.on('error', reject);
  });
}

async function buscarTarefas(listaId, perfil, nome) {
  if (!CLICKUP_TOKEN) return [];
  try {
    const url = `https://api.clickup.com/api/v2/list/${listaId}/task?limit=50&order_by=updated&reverse=true`;
    const dados = await fetchJson(url, { Authorization: CLICKUP_TOKEN });
    if (!dados.tasks) return [];
    return dados.tasks.map(t => ({
      id: `clickup-${t.id}`,
      type: 'clickup',
      titulo: t.name,
      data: t.date_updated ? new Date(+t.date_updated).toISOString().split('T')[0] : hoje(),
      perfil,
      status: t.status?.status || 'sem status',
      conteudo: `**${t.name}**\n\nStatus: ${t.status?.status || '—'}\nLista: ${nome}\nPerfil: @${perfil}\n\n[Abrir no ClickUp](${t.url})`,
      tags: [perfil, nome, t.status?.status, ...(t.tags?.map(tg => tg.name) || [])].filter(Boolean),
      links: [],
    }));
  } catch (e) {
    console.error(`  Erro lista ${listaId}:`, e.message);
    return [];
  }
}

function carregarGranola() {
  const cache = path.join(__dirname, 'granola-cache.json');
  if (!fs.existsSync(cache)) return [];
  try {
    const reunioes = JSON.parse(fs.readFileSync(cache, 'utf8'));
    return reunioes.map(r => ({
      id: `meeting-${r.id}`,
      type: 'meeting',
      titulo: r.titulo,
      data: r.data,
      perfil: r.perfil,
      conteudo: r.conteudo || `**${r.titulo}**\n\nData: ${r.data}\nPerfil: @${r.perfil}`,
      tags: ['reunião', r.tipo || 'nota', r.perfil],
      links: [],
    }));
  } catch { return []; }
}

function criarConexoes(nodes) {
  const links = [];
  const seen = new Set();
  const addLink = (a, b, tipo) => {
    const k = [a, b].sort().join('|');
    if (seen.has(k)) return;
    seen.add(k);
    links.push({ source: a, target: b, tipo });
  };

  // Agrupa por semana
  const porSemana = {};
  nodes.forEach(n => {
    const d = new Date(n.data);
    const w = `${d.getFullYear()}-${Math.ceil((d.getDate() + new Date(d.getFullYear(), d.getMonth(), 1).getDay()) / 7)}`;
    (porSemana[w] = porSemana[w] || []).push(n);
  });

  Object.values(porSemana).forEach(grupo => {
    const reunioes  = grupo.filter(n => n.type === 'meeting');
    const clickup   = grupo.filter(n => n.type === 'clickup');
    const conteudo  = grupo.filter(n => n.type === 'content');

    reunioes.forEach(r => {
      clickup.slice(0, 3).forEach(c => addLink(r.id, c.id, 'semana'));
      conteudo.slice(0, 2).forEach(c => addLink(r.id, c.id, 'semana'));
    });
    for (let i = 0; i < reunioes.length - 1; i++) addLink(reunioes[i].id, reunioes[i+1].id, 'sequencia');
  });

  // CRM ↔ Reunião por nome
  const reunioes = nodes.filter(n => n.type === 'meeting');
  const crm = nodes.filter(n => n.type === 'clickup' && (n.tags.includes('CRM Oficina') || n.tags.includes('CRM DEVIL CHAT')));
  reunioes.forEach(r => {
    const nome = r.titulo.toLowerCase();
    crm.forEach(c => {
      const prim = c.titulo.toLowerCase().split(' ')[0];
      if (prim.length > 3 && nome.includes(prim)) addLink(r.id, c.id, 'crm_match');
    });
  });

  return links;
}

async function main() {
  console.log('DEVIL Mapa — Atualizando dados...');
  const nodes = [];

  // ClickUp
  for (const lista of LISTAS) {
    console.log(`  Buscando ${lista.nome}...`);
    const tarefas = await buscarTarefas(lista.id, lista.perfil, lista.nome);
    nodes.push(...tarefas);
    console.log(`    ${tarefas.length} tarefas`);
  }

  // Granola (reuniões — cache local)
  const reunioes = carregarGranola();
  nodes.push(...reunioes);
  console.log(`  Granola: ${reunioes.length} reuniões`);

  if (nodes.length === 0) {
    console.error('Sem dados — abortando. Verifique CLICKUP_API_TOKEN.');
    process.exit(1);
  }

  const links = criarConexoes(nodes);
  const out = {
    geradoEm: new Date().toISOString(),
    totalNodes: nodes.length,
    totalLinks: links.length,
    nodes,
    links,
  };

  fs.writeFileSync(path.join(__dirname, 'graph-data.json'), JSON.stringify(out, null, 2));
  console.log(`\nPronto: ${nodes.length} nós, ${links.length} conexões`);
}

main().catch(e => { console.error(e); process.exit(1); });
