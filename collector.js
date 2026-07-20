#!/usr/bin/env node
/**
 * DEVIL Graph — Collector for GitHub Actions
 * Fetches only ClickUp data (no local files needed)
 * Uses Node 20+ native fetch
 */

const fs   = require('fs');
const path = require('path');

const TOKEN = process.env.CLICKUP_API_TOKEN;
if (!TOKEN) { console.error('ERROR: CLICKUP_API_TOKEN not set'); process.exit(1); }

const DATA = path.join(__dirname, 'data');
fs.mkdirSync(DATA, { recursive: true });

function hoje() { return new Date().toISOString().split('T')[0]; }
function slugify(s) { return String(s).toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 40); }

// Cores fixas para espaços conhecidos; novos espaços recebem cor da paleta de fallback automaticamente
const COR_ESPACO_FIXO = {
  '90138228562':  '#7c3aed', // OFICINA
  '90138131603':  '#ec4899', // HOMESCHOOLING
  '90138131805':  '#f97316', // Bruna Boreggio
  '901313861779': '#06b6d4', // Priscila Leite
  '90138131766':  '#22c55e', // Home
  '90138441679':  '#a78bfa', // Pesquisas
  '901312153685': '#fb923c', // Entrega
  '90138131840':  '#f43f5e', // Simone
  '90138131783':  '#38bdf8', // Viviane Sanches
  '901313799671': '#84cc16', // Contabilidade
  '901313688913': '#a855f7', // OFICINA TEMPLATES
  '901313862831': '#14b8a6', // Espaço de Trabalho
  '901313883678': '#e879f9', // Regiane Silva
  '901313921750': '#fb7185', // ESTELINA
};
const COR_FALLBACK = ['#34d399','#60a5fa','#fbbf24','#f87171','#a78bfa','#2dd4bf','#f472b6','#818cf8'];
function corParaEspaco(id, idx) { return COR_ESPACO_FIXO[id] || COR_FALLBACK[idx % COR_FALLBACK.length]; }

const TEAM_ID = '90131929380';

const SKIP_LIST_NAMES = ['controle de caixa', 'fio 2025'];
function deveSkipLista(nome) {
  const n = nome.toLowerCase();
  return SKIP_LIST_NAMES.some(s => n.includes(s));
}

async function api(url) {
  const r = await fetch(url, { headers: { Authorization: TOKEN } });
  if (!r.ok) throw new Error(`API ${r.status}: ${url}`);
  return r.json();
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function buscarEspacos() {
  // Descoberta dinâmica — nunca precisa atualizar lista manualmente
  const teamData = await api(`https://api.clickup.com/api/v2/team/${TEAM_ID}/space?archived=false`);
  const todos = teamData.spaces || [];
  console.log(`  ${todos.length} espaços encontrados no ClickUp`);

  const result = [];
  for (let i = 0; i < todos.length; i++) {
    const sp = todos[i];
    const sid = sp.id;
    try {
      const entry = { id: sid, nome: sp.name || sid, pastas: [], cor: corParaEspaco(sid, i) };

      const fd = await api(`https://api.clickup.com/api/v2/space/${sid}/folder?archived=false`);
      for (const f of (fd.folders || [])) {
        const ld = await api(`https://api.clickup.com/api/v2/folder/${f.id}/list?archived=false`);
        entry.pastas.push({
          id: f.id, nome: f.name,
          listas: (ld.lists || []).map(l => ({ id: l.id, nome: l.name })),
        });
        await sleep(100);
      }
      // Listas foltas (sem pasta)
      const fl = await api(`https://api.clickup.com/api/v2/space/${sid}/list?archived=false`);
      if ((fl.lists || []).length > 0) {
        entry.pastas.push({ id: `foltas-${sid}`, nome: sp.name + ' (geral)', listas: fl.lists.map(l => ({ id: l.id, nome: l.name })) });
      }

      result.push(entry);
      console.log(`  OK ${entry.nome}: ${entry.pastas.length} pastas`);
    } catch (e) {
      console.log(`  ERRO ${sp.name} (${sid}): ${e.message}`);
    }
  }
  return result;
}

function buildHierarquia(estrutura) {
  const espacos = [], pastas = [], listas = [];
  estrutura.forEach(sp => {
    const espacoId = `espaco-${sp.id}`;
    const cor = sp.cor || COR_ESPACO_FIXO[sp.id] || '#666666';
    espacos.push({ id: espacoId, spaceId: sp.id, nome: sp.nome, cor, perfil: sp.id });
    sp.pastas.forEach(p => {
      const pastaId = `pasta-${p.id}`;
      pastas.push({ id: pastaId, pastaId: p.id, espacoId, nome: p.nome, cor, perfil: sp.id });
      p.listas.forEach(l => {
        if (deveSkipLista(l.nome)) return;
        listas.push({ id: `lista-${l.id}`, listId: l.id, pastaId, nome: l.nome, perfil: sp.id });
      });
    });
  });
  return { espacos, pastas, listas };
}

async function fetchTasks(listId, perfil, listaNome, maxTasks = 80) {
  const tasks = [];
  let page = 0;
  while (tasks.length < maxTasks) {
    try {
      const data = await api(
        `https://api.clickup.com/api/v2/list/${listId}/task?include_markdown_description=true&page=${page}&order_by=updated&reverse=true`
      );
      if (!data.tasks || data.tasks.length === 0) break;
      for (const t of data.tasks) {
        tasks.push({
          id: t.id, name: t.name,
          status: t.status?.status || 'sem status',
          statusColor: t.status?.color || '#666666',
          description: (t.markdown_description || t.description || '').slice(0, 600),
          url: `https://app.clickup.com/t/${t.id}`,
          updated: t.date_updated ? new Date(+t.date_updated).toISOString().split('T')[0] : hoje(),
          listId, perfil, listaNome,
        });
      }
      if (data.tasks.length < 100) break;
      page++;
      await sleep(150);
    } catch (_) { break; }
  }
  return tasks;
}

async function coletarTasks(hierarquia) {
  console.log('  Buscando tarefas...');
  const all = [];
  for (const lista of hierarquia.listas) {
    const isCRM = lista.nome.toLowerCase().includes('crm');
    const tasks = await fetchTasks(lista.listId, lista.perfil, lista.nome, isCRM ? 50 : 80);
    all.push(...tasks);
    if (tasks.length > 0) process.stdout.write(`  -> ${lista.nome}: ${tasks.length}\n`);
  }
  return all;
}

function criarNosHierarquia(hierarquia) {
  const nodes = [];
  hierarquia.espacos.forEach(e => {
    nodes.push({ id: e.id, type: 'espaco', titulo: e.nome, data: hoje(), perfil: e.perfil, cor: e.cor,
      conteudo: `**${e.nome}**\n\nEspaco ClickUp`, tags: ['espaco', e.nome], links: [] });
  });
  hierarquia.pastas.forEach(p => {
    const esp = hierarquia.espacos.find(e => e.id === p.espacoId);
    nodes.push({ id: p.id, type: 'pasta', titulo: p.nome, data: hoje(), perfil: p.perfil, cor: p.cor,
      parentId: p.espacoId, conteudo: `**${p.nome}**\n\nPasta em ${esp?.nome || ''}`, tags: ['pasta', p.nome], links: [] });
  });
  hierarquia.listas.forEach(l => {
    const pasta = hierarquia.pastas.find(p => p.id === l.pastaId);
    nodes.push({ id: l.id, type: 'lista', titulo: l.nome, data: hoje(), perfil: l.perfil, listId: l.listId,
      parentId: l.pastaId, conteudo: `**${l.nome}**\n\nLista em ${pasta?.nome || ''}`, tags: ['lista', l.nome], links: [] });
  });
  return nodes;
}

function criarStatusGroups(apiTasks, hierarquia) {
  const sgMap = new Map();
  const listIdParaNoId = {};
  hierarquia.listas.forEach(l => { listIdParaNoId[l.listId] = l.id; });
  apiTasks.forEach(t => {
    const listaNodeId = listIdParaNoId[t.listId];
    if (!listaNodeId) return;
    const sgId = `sg-${t.listId}-${slugify(t.status)}`;
    if (!sgMap.has(sgId)) {
      sgMap.set(sgId, { id: sgId, type: 'status_group', titulo: t.status, data: hoje(), perfil: t.perfil,
        cor: t.statusColor || '#666666', listId: t.listId, listaNodeId, parentId: listaNodeId, count: 0,
        conteudo: '', tags: ['status', t.status], links: [] });
    }
    const sg = sgMap.get(sgId);
    sg.count++;
    sg.conteudo = `**${t.status}**\n\nLista: ${t.listaNome}\nTarefas: ${sg.count}`;
  });
  return Array.from(sgMap.values());
}

function criarNosTask(apiTasks, hierarquia) {
  const listIdParaNoId = {};
  hierarquia.listas.forEach(l => { listIdParaNoId[l.listId] = l.id; });
  return apiTasks.map(t => {
    const listaNodeId = listIdParaNoId[t.listId];
    const sgId = listaNodeId ? `sg-${t.listId}-${slugify(t.status)}` : null;
    return {
      id: `clickup-${t.id}`, type: 'clickup', titulo: t.name, data: t.updated, perfil: t.perfil,
      listId: t.listId, listaNodeId, statusNodeId: sgId, parentId: sgId || listaNodeId, status: t.status,
      conteudo: [`**${t.name}**`, ``, `Lista: ${t.listaNome}`, `Status: ${t.status}`, t.description ? `\n${t.description}` : '', ``, `[Abrir no ClickUp](${t.url})`].join('\n'),
      tags: [t.listaNome, t.status].filter(Boolean), links: [],
    };
  });
}

function criarConexoes(nodes) {
  const links = [], vistos = new Set();
  const nodeIds = new Set(nodes.map(n => n.id));
  nodes.filter(n => n.parentId).forEach(n => {
    const key = `${n.parentId}|${n.id}`;
    if (vistos.has(key) || !nodeIds.has(n.parentId)) return;
    vistos.add(key);
    links.push({ source: n.parentId, target: n.id, tipo: 'hierarquia' });
  });
  return links;
}

async function main() {
  console.log('\nDEVIL Graph Collector (GitHub Actions)\n');

  console.log('Buscando estrutura dos espaços (dinâmico)...');
  const estrutura = await buscarEspacos();
  const hierarquia = buildHierarquia(estrutura);
  console.log(`${hierarquia.espacos.length} espacos | ${hierarquia.pastas.length} pastas | ${hierarquia.listas.length} listas`);

  const nodes = [];
  nodes.push(...criarNosHierarquia(hierarquia));

  console.log('\nTarefas ClickUp...');
  const apiTasks = await coletarTasks(hierarquia);

  const statusGroups = criarStatusGroups(apiTasks, hierarquia);
  nodes.push(...statusGroups);
  nodes.push(...criarNosTask(apiTasks, hierarquia));

  const links = criarConexoes(nodes);

  const output = path.join(__dirname, 'graph-data.json');
  fs.writeFileSync(output, JSON.stringify({
    geradoEm: new Date().toISOString(),
    totalNodes: nodes.length, totalLinks: links.length,
    nodes, links,
  }, null, 2));

  const tipos = {};
  nodes.forEach(n => { tipos[n.type] = (tipos[n.type] || 0) + 1; });
  console.log(`\nSalvo: ${nodes.length} nos, ${links.length} conexoes`);
  console.log(Object.entries(tipos).map(([k,v]) => `  ${k}: ${v}`).join('\n'));
}

main().catch(e => { console.error('Erro:', e.message); process.exit(1); });
