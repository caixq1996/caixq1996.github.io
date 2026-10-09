/* Hongo nutrition v4.1: per-dish absolute contributions and explicit percentage denominators.
   Read-only extension: does not change food values, personal targets, quantities or saved meals. */
(async function () {
'use strict';
const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const keys = ['kcal','protein','fat','carbs','salt','calcium','iron','vitA','vitB1','vitB2','vitC','veg','fiber','saturatedFat'];
const scenarioNames = {center:'默认估算',low:'偏低摄入 · 多扣除',high:'偏高摄入 · 少扣除'};
const finite = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const quantityText = value => String(Math.round(value * 1000) / 1000);
// Keep fractional-portion contributions visible instead of rounding small amounts to zero.
function numberText(value) {
  if (!finite(value)) return '未知';
  if (value > 0 && value < 0.005) return '<0.01';
  return Number(value.toFixed(2)).toString();
}
function percentageText(value) {
  if (!finite(value)) return '—';
  if (value > 0 && value < 0.05) return '<0.1%';
  return value.toFixed(1) + '%';
}
let calculator, nutrition;
const openStates = new Map();
let allOpen = true;

// Match the v4 source rules: missing treated micronutrients are not replaced with raw values.
function servingValue(food, index, raw, state) {
  if (index >= 12) return null;
  const manual = state.overrides?.[food.id];
  if (index < 5) {
    if (raw) return food.manual ? null : food.base?.[index] ?? null;
    return manual?.values?.[index] ?? food[state.scenario]?.[index] ?? food.base?.[index] ?? null;
  }
  if ((food.flags || []).includes(keys[index]) || !finite(food.base?.[index])) return null;
  if (raw) return food.manual ? null : food.base[index];
  return food.modified || food.manual || manual ? null : food.base[index];
}
function sourceClass(food, state, raw) {
  if (raw) return food.manual ? '无原表' : food.history ? '历史原表参考' : '原配方参考';
  if (state.overrides?.[food.id] || food.manual) return '自填值';
  if (food.modified) return '估算';
  return food.history ? '历史原表' : '官方原表';
}
function breakdown(raw = false) {
  const state = calculator.backup().state;
  const selected = calculator.selected();
  return nutrition.nutrients().map(nutrient => {
    const index = nutrient.index;
    const items = selected.map((food, order) => {
      const quantity = state.q[food.id] || 0;
      const value = servingValue(food, index, raw, state);
      const perServing = finite(value) ? value : null;
      return {
        id:food.id, name:food.name, quantity, order, perServing,
        amount:perServing === null ? null : perServing * quantity,
        sourceClass:sourceClass(food, state, raw),
        source:food.manual ? null : 'https://comenu.jp/tokyo-univ/390144/menu/' + (food.parent || food.id),
        warning:food.warning && !state.overrides?.[food.id] ? food.warning : null,
        percentage:null
      };
    });
    const knownItems = items.filter(item => item.amount !== null);
    const knownTotal = knownItems.reduce((sum, item) => sum + item.amount, 0);
    const complete = knownItems.length === items.length;
    const total = complete ? knownTotal : null;
    const denominator = knownItems.length && knownTotal > 0 ? knownTotal : null;
    for (const item of items) if (item.amount !== null && denominator !== null) item.percentage = item.amount / denominator * 100;
    items.sort((a, b) => a.amount === null ? (b.amount === null ? a.order - b.order : 1) : b.amount === null ? -1 : b.amount - a.amount || a.order - b.order);
    return {
      key:keys[index], index, name:nutrient.name, unit:nutrient.unit,
      basis:raw ? '原配方参考（非处理后摄入）' : '当前吃法',
      scenario:state.scenario, total, knownTotal, denominator, complete,
      knownCount:knownItems.length, missingCount:items.length - knownItems.length,
      shareBasis:complete ? (raw ? '占原配方合计' : '占本餐合计') : (raw ? '占原表已知小计' : '占已知小计'),
      items
    };
  });
}
function denominatorNote(group) {
  if (!group.items.length) return '尚未选菜。';
  if (!group.knownCount) return '所有已选菜品的此项数据均未知，不能计算贡献量或百分比。';
  if (group.denominator === null) return (group.complete ? '该项合计为0' : '已知小计为0，且有缺失数据') + '；分母为0，百分比显示“—”。';
  if (!group.complete) return '占比的分母仅为已知小计 ' + numberText(group.knownTotal) + ' ' + group.unit + '；另有 ' + group.missingCount + ' 道菜未知，不代表整餐占比。';
  return '占比的分母为' + (group.basis === '当前吃法' ? '本餐合计 ' : '原配方参考合计 ') + numberText(group.total) + ' ' + group.unit + '。';
}
function contributionTable(group) {
  const totalLabel = !group.knownCount ? '合计未知' : group.complete ? '合计' : '已知小计';
  const amountTotal = !group.knownCount ? '未知' : numberText(group.knownTotal) + ' ' + group.unit;
  return `<table class="contribution-table" aria-label="${esc(group.name + '，' + group.basis + '，各菜贡献')}">
    <colgroup><col class="contribution-name-col"><col class="contribution-amount-col"><col class="contribution-share-col"></colgroup>
    <thead><tr><th scope="col">已选菜品</th><th scope="col">绝对值</th><th scope="col">${esc(group.shareBasis)}</th></tr></thead>
    <tbody>${group.items.map(item => `<tr data-contribution-id="${esc(item.id)}">
      <th scope="row"><span class="contribution-name">${esc(item.name)}</span><small>${quantityText(item.quantity)} 份 · ${esc(item.sourceClass)}${item.warning ? ' · 待核实' : ''}</small></th>
      <td class="contribution-amount">${item.amount === null ? '未知' : esc(numberText(item.amount) + ' ' + group.unit)}</td>
      <td class="contribution-percent">${percentageText(item.percentage)}</td>
    </tr>`).join('')}</tbody>
    <tfoot><tr><th scope="row">${totalLabel}</th><td>${esc(amountTotal)}</td><td>${group.denominator === null ? '—' : '100.0%'}</td></tr></tfoot>
  </table>`;
}
function detailsHtml(group, rawGroup) {
  if (!group.items.length) return '';
  const open = openStates.has(group.key) ? openStates.get(group.key) : allOpen;
  let html = `<details class="contribution-detail" data-contribution-key="${group.key}" ${open ? 'open' : ''}>
    <summary><span>各菜贡献</span><small>${group.items.length} 道菜 · ${esc(group.shareBasis)}</small></summary>
    <div class="contribution-body"><p class="contribution-note">${esc(denominatorNote(group))}</p>${contributionTable(group)}`;
  if (!group.complete && rawGroup.knownCount) {
    const refKey = 'raw-' + group.key;
    html += `<details class="contribution-reference" data-contribution-key="${refKey}" ${openStates.get(refKey) ? 'open' : ''}>
      <summary>原配方参考明细（非实际摄入）</summary>
      <p class="contribution-note">仅对照原配方，不能把这些数值填入处理后摄入。${esc(denominatorNote(rawGroup))}</p>${contributionTable(rawGroup)}</details>`;
  }
  return html + '</div></details>';
}
function render() {
  const rows = $('goalRows');
  if (!rows) return;
  const current = breakdown(false), raw = breakdown(true);
  for (let i = 0; i < current.length; i++) {
    const card = rows.querySelector('[data-nutrient="' + current[i].key + '"]');
    if (!card || card.querySelector(':scope > .contribution-detail')) continue;
    card.insertAdjacentHTML('beforeend', detailsHtml(current[i], raw[i]));
  }
  const empty = !calculator.selected().length;
  $('collapseContributions').disabled = empty;
  $('expandContributions').disabled = empty;
  $('exportContributions').disabled = empty;
  markVersion();
}
function setAll(open) {
  allOpen = open;
  for (const key of keys) openStates.set(key, open);
  $('goalRows').querySelectorAll('.contribution-detail').forEach(detail => {detail.open = open;});
}
function markVersion() {
  const runtime = $('runtime');
  if (runtime && /v(?:3\.0|4\.0)/.test(runtime.textContent)) runtime.textContent = runtime.textContent.replace(/v(?:3\.0|4\.0)/g, 'v4.1');
  calculator.version = '4.1';
  nutrition.version = '4.1';
  const meta = $('settingsView')?.querySelector('.section-heading p');
  if (meta && meta.textContent.includes('v4.0')) meta.textContent = meta.textContent.replace('v4.0','v4.1');
}
function report() {
  return nutrition.report() + '\n\n各菜贡献明细\n绝对值＝每份数值×所选份数；百分比＝该菜贡献÷同项营养合计。不是建议摄入量达成率。\n' + breakdown(false).map(group =>
    '\n【' + group.name + '】' + denominatorNote(group) + '\n' + group.items.map(item =>
      item.name + ' × ' + quantityText(item.quantity) + '份｜' + (item.amount === null ? '未知' : numberText(item.amount) + ' ' + group.unit) + '｜' + group.shareBasis + ' ' + percentageText(item.percentage) + '｜' + item.sourceClass
    ).join('\n')
  ).join('\n') + '\n\n未知不是0；含估算时，占比也是当前情景估值。显示值经四舍五入，百分比合计可能为99.9%或100.1%。';
}
function csv() {
  const headers = ['营养素','单位','计算口径','菜品','所选份数','每份数值','本次贡献绝对值','贡献百分比(%)','百分比分母','百分比口径','已知菜品数','未知菜品数','情景','数据类型','来源','警告'];
  const rows = [headers];
  // CSV is a long-format, current-intake table, deliberately not mixed with original-recipe values.
  for (const group of breakdown(false)) for (const item of group.items) rows.push([
    group.name,group.unit,group.basis,item.name,item.quantity,item.perServing,item.amount,item.percentage,
    group.denominator,group.shareBasis,group.knownCount,group.missingCount,scenarioNames[group.scenario] || group.scenario,item.sourceClass,item.source,item.warning
  ]);
  const cell = value => {
    let text = value === null || value === undefined ? '' : String(value);
    if (/^[=+@\-]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  };
  return '\ufeff' + rows.map(row => row.map(cell).join(',')).join('\r\n');
}
function openText(title, text, name, type) {
  $('modalTitle').textContent = title;
  $('modalBody').innerHTML = '<p class="caption">包含当前所有已选菜品，不受搜索和分类影响。空值表示未知；CSV保留未四舍五入的贡献量、百分比及分母。</p><textarea id="contributionExportText" readonly aria-label="贡献明细文本"></textarea><div class="actions"><button type="button" class="primary" id="copyContributionText">复制</button><button type="button" id="saveContributionText">分享 / 保存文件</button></div><p class="caption" id="contributionExportStatus" role="status"></p>';
  $('contributionExportText').value = text;
  $('modal').hidden = false;
  document.body.classList.add('modal-open');
  $('closeModal').focus({preventScroll:true});
  $('copyContributionText').onclick = async () => {
    try {await navigator.clipboard.writeText(text); $('contributionExportStatus').textContent = '已复制';}
    catch (error) {const area = $('contributionExportText');area.focus();area.select();area.setSelectionRange(0,text.length);$('contributionExportStatus').textContent = '已全选，请用系统复制菜单。';}
  };
  $('saveContributionText').onclick = async () => {
    try {
      const file = new File([text],name,{type});
      if (navigator.canShare && navigator.canShare({files:[file]})) {await navigator.share({files:[file],title}); return;}
      const url = URL.createObjectURL(file), anchor = document.createElement('a');
      anchor.href = url;anchor.download = name;document.body.appendChild(anchor);anchor.click();anchor.remove();setTimeout(() => URL.revokeObjectURL(url),30000);
      $('contributionExportStatus').textContent = '已请求保存；浏览器不支持下载时可复制上方文本。';
    } catch (error) {if(error.name !== 'AbortError') $('contributionExportStatus').textContent = '未能保存，请使用复制。';}
  };
}
const css = `
.contribution-controls{border-top:1px solid var(--line);padding-top:11px;margin-top:10px}
.contribution-controls>p{font-size:11px;line-height:1.75;color:var(--muted);margin:0 0 7px}
.contribution-buttons{display:flex;flex-wrap:wrap;gap:6px}
.contribution-buttons button{font-size:11px;min-height:40px;padding:6px 10px}
.contribution-detail{border-top:1px solid var(--line);margin-top:13px;padding-top:3px}
.contribution-detail>summary{display:flex;align-items:center;justify-content:space-between;gap:8px;cursor:pointer;min-height:44px;list-style:none;font-size:12px;font-weight:600}
.contribution-detail>summary::-webkit-details-marker{display:none}
.contribution-detail>summary>span::before{content:'▸';display:inline-block;width:15px;color:var(--green)}
.contribution-detail[open]>summary>span::before{content:'▾'}
.contribution-detail>summary small{font-size:10px;font-weight:400;text-align:right}
.contribution-note{font-size:10px;color:var(--muted);line-height:1.65;margin:0 0 8px;overflow-wrap:anywhere}
.contribution-table{width:100%;table-layout:fixed;border-collapse:collapse;font-size:11px;font-variant-numeric:tabular-nums}
.contribution-name-col{width:49%}.contribution-amount-col{width:29%}.contribution-share-col{width:22%}
.contribution-table th,.contribution-table td{padding:7px 3px;border-bottom:1px solid #e3eae4;vertical-align:middle;text-align:right;overflow-wrap:anywhere}
.contribution-table th:first-child{padding-left:0;text-align:left}
.contribution-table th:last-child,.contribution-table td:last-child{padding-right:0}
.contribution-table thead th{font-size:10px;font-weight:500;color:var(--muted);line-height:1.45}
.contribution-table tbody th{font-weight:500}
.contribution-name{display:block;line-height:1.5;word-break:break-word}
.contribution-table small{display:block;font-size:9px;font-weight:400;line-height:1.5;margin-top:2px;color:var(--muted)}
.contribution-amount,.contribution-percent{font-weight:600;line-height:1.6}
.contribution-table tfoot th,.contribution-table tfoot td{border-bottom:0;font-weight:600;padding-top:9px}
.contribution-reference{padding:7px 9px;background:#f0f3ef;border-radius:8px;margin-top:11px}
.contribution-reference>summary{font-size:10px;line-height:1.65;min-height:40px;display:flex;align-items:center;cursor:pointer;color:var(--muted)}
.contribution-reference>summary::before{content:'▸';margin-right:6px}
.contribution-reference[open]>summary::before{content:'▾'}
.contribution-reference .contribution-table{font-size:10px}
.contribution-body{min-width:0}
.nut-row{align-self:start}
@media(max-width:360px){.contribution-table{font-size:10px}.contribution-table thead th{font-size:9px}.contribution-name-col{width:45%}.contribution-amount-col{width:32%}.contribution-share-col{width:23%}}
@media print{.contribution-buttons{display:none}.contribution-detail>.contribution-body{display:block!important}.contribution-detail>summary{display:none}}
`;
try {
  for (let attempt=0;attempt<200&&!window.HongoNutrition;attempt++) await new Promise(resolve=>setTimeout(resolve,100));
  calculator=window.HongoCalculator;nutrition=window.HongoNutrition;
  if (!calculator || !nutrition || !$('goalRows')) throw Error('营养合计模块尚未就绪');
  const style=document.createElement('style');style.textContent=css;document.head.appendChild(style);
  const controls=document.createElement('div');controls.className='contribution-controls';controls.id='contributionControls';
  controls.innerHTML='<p><strong>各菜贡献＝每份营养 × 所选份数。</strong> 占比相对于同一营养素的本餐合计，不是建议摄入量达成率。各菜按贡献从高到低排列；数据不全时仅显示“占已知小计”。含估算时，占比也随当前估算情景变化。</p><div class="contribution-buttons"><button type="button" id="expandContributions">展开各菜明细</button><button type="button" id="collapseContributions">收起各菜明细</button><button type="button" id="exportContributions">导出贡献明细 CSV</button></div><p style="margin-top:6px">显示值经四舍五入，分项百分比相加可能为99.9%或100.1%。</p>';
  $('goalBasis').after(controls);
  $('expandContributions').onclick=()=>setAll(true);
  $('collapseContributions').onclick=()=>setAll(false);
  $('exportContributions').onclick=()=>openText('各菜营养贡献 · CSV',csv(),'本乡食堂_各菜营养贡献.csv','text/csv;charset=utf-8');
  $('goalRows').addEventListener('toggle',event=>{const el=event.target;if(el.dataset.contributionKey && el.isConnected)openStates.set(el.dataset.contributionKey,el.open);},true);
  // Keep the existing copy action, but include the new breakdown in its output.
  document.addEventListener('click',event=>{const button=event.target.closest('button');if(button?.id==='copyNutritionGoals'){event.preventDefault();event.stopImmediatePropagation();openText('本餐营养、建议与各菜贡献',report(),'本乡食堂_营养与各菜贡献.txt','text/plain;charset=utf-8');}},true);
  new MutationObserver(render).observe($('goalRows'),{childList:true});
  new MutationObserver(markVersion).observe($('runtime'),{childList:true,characterData:true,subtree:true});
  render();
  window.HongoContributions={version:'4.1',breakdown,csv,report};
} catch(error) {
  console.error('Nutrient contributions:',error);
  const message=document.createElement('p');message.className='warning-text';message.textContent='各菜贡献明细暂未载入：'+error.message+'。原有点菜与营养合计仍可使用，请联网后重新载入。';
  ($('goalPanel')||$('app'))?.appendChild(message);
}
})();
