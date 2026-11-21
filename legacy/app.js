const storageKey = 'ledger-budget-v1';
const $ = id => document.getElementById(id);
let state;
let canSave = true;
try {
  state = JSON.parse(localStorage.getItem(storageKey)) ?? Ledger.starter();
} catch {
  state = Ledger.starter();
  canSave = false;
}
const moneyFormat = new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD'});
const percentFormat = new Intl.NumberFormat('en-CA',{style:'percent',maximumFractionDigits:1});
const fmt = value => value === null ? '—' : moneyFormat.format(Math.abs(value)<0.000001?0:value);
const rate = value => value === null ? '—' : percentFormat.format(value);
const esc = value => String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const titles = {overview:'Monthly overview',budget:'Budget',transactions:'Transactions',goals:'Savings goals'};
const palette = ['#327b70','#6692d5','#e5aa63','#796bb2','#4291af','#cc8292','#a6b85e','#8d9dae'];

function persist() {
  try {
    if (canSave) localStorage.setItem(storageKey,JSON.stringify(state));
  } catch {
    canSave = false;
  }
  $('storage-alert').hidden = canSave;
  if(!canSave) $('storage-alert').textContent = 'Browser storage is unavailable. Download Excel before closing this page.';
}
function update() {
  state.sample = false;
  $('sample').hidden = true;
  persist();
  renderOverview();
}
function go() {
  const hash = location.hash.slice(1);
  const page = Object.hasOwn(titles,hash) ? hash : 'overview';
  $('title').textContent = titles[page];
  for(const key of Object.keys(titles)) {
    $(key).hidden = key!==page;
    const button = document.querySelector('[data-page="'+key+'"]');
    if(key===page) button.setAttribute('aria-current','page');
    else button.removeAttribute('aria-current');
  }
  if(page==='budget') renderBudget();
  if(page==='transactions') renderTransactions();
  if(page==='goals') renderGoals();
  if(page==='overview') renderOverview();
}
function barRows(pairs) {
  const max = Math.max(1,...pairs.flatMap(pair=>pair.slice(1).map(Math.abs)));
  return pairs.map(([name,plan,actual])=>{
    const bar=(value,kind)=>'<div class="bar-row"><div class="track" aria-hidden="true"><i class="bar '+kind+'" style="width:'+Math.abs(value??0)/max*100+'%"></i></div><span>'+fmt(value)+'</span></div>';
    return '<div class="flow-line"><span class="flow-name">'+name+'</span>'+bar(plan,'plan')+bar(actual,'actual')+'</div>';
  }).join('');
}
function ring(report) {
  const positive = report.breakdown.filter(row=>row.planned>0);
  const rows = positive.slice(0,7);
  if(positive.length>7) rows.push({name:'All other categories',planned:positive.slice(7).reduce((sum,row)=>sum+row.planned,0)});
  const gross = rows.reduce((sum,row)=>sum+row.planned,0);
  let stop = 0;
  const gradient = rows.map((row,index)=>{
    const start = stop;
    stop += row.planned/gross*100;
    return palette[index]+' '+start+'% '+Math.min(stop,100)+'%';
  }).join(',');
  const legend = rows.map((row,index)=>'<div><i style="background:'+palette[index]+'"></i><span>'+esc(row.name)+'</span><b>'+fmt(row.planned)+'</b></div>').join('');
  return '<div class="ring" aria-hidden="true"'+(gradient?' style="background:conic-gradient('+gradient+')"':'')+'><div class="ring-center"><span>Spending</span><strong>'+fmt(report.planSpend)+'</strong></div></div><div class="legend">'+(legend||'<span class="empty">Add budget items to see a breakdown.</span>')+'</div>';
}
function table(headers,rows,empty) {
  if(!rows.length) return '<p class="empty">'+empty+'</p>';
  return '<div class="table-wrap"><table><thead><tr>'+headers.map(label=>'<th scope="col">'+label+'</th>').join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map(value=>'<td>'+value+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
}
function renderOverview() {
  const r = Ledger.report(state);
  $('remaining').textContent = fmt(r.afterTarget);
  $('remaining').classList.toggle('deficit',r.afterTarget<0);
  $('hero-copy').textContent = r.planIncome===null?'Add your take-home pay in Budget to calculate cash left.':fmt(r.planCash)+' available before the general savings target.';
  $('target').textContent = fmt(r.target)+' target';
  $('progress').value = r.target>0?Math.max(0,Math.min(r.general/r.target*100,100)):0;
  $('goal-copy').textContent = r.target>0?fmt(r.general)+' saved this month · '+fmt(r.leftToSave)+' still to save':'Set a monthly target in Budget.';
  const stats = [
    ['Take-home income',fmt(r.planIncome),'Actual '+fmt(r.actualIncome)],
    ['Monthly spending',fmt(r.planSpend),'Actual '+fmt(r.active?r.actualSpend:null)],
    ['Cash before target',fmt(r.planCash),'Actual '+fmt(r.actualCash)],
    ['Savings rate',rate(r.actualRate),'Planned transfers '+rate(r.planRate)],
  ];
  $('stats').innerHTML = stats.map(([label,value,detail])=>'<div class="stat"><span>'+label+'</span><strong>'+value+'</strong><small>'+detail+'</small></div>').join('');
  $('flow').innerHTML = barRows([['Income',r.planIncome,r.actualIncome],['Spending',r.planSpend,r.active?r.actualSpend:null],['Net savings',r.planSaved,r.active?r.actualSaved:null]]);
  $('breakdown').innerHTML = ring(r);
  $('compare').innerHTML = table(['Category','Planned','Actual','Plan remaining'],r.breakdown.map(row=>[
    esc(row.name),fmt(row.planned),fmt(r.active?row.actual:null),fmt(r.active?row.planned-row.actual:null),
  ]),'Add expenses or transactions to see the category breakdown.');
}
function input(label,key,value,type='text',options='') {
  return '<input aria-label="'+esc(label)+'" data-field="'+key+'" type="'+type+'" value="'+esc(value)+'" '+options+'>';
}
function select(label,key,value,options) {
  return '<select aria-label="'+esc(label)+'" data-field="'+key+'">'+options.map(option=>{
    const [id,name] = Array.isArray(option)?option:[option,option];
    return '<option value="'+esc(id)+'"'+(id===value?' selected':'')+'>'+esc(name)+'</option>';
  }).join('')+'</select>';
}
function removeButton(label) {
  return '<button type="button" class="remove" aria-label="Remove '+label+'" data-remove>×</button>';
}
function editTable(headers,rows,empty,group) {
  if(!rows.length) return '<p class="empty">'+empty+'</p>';
  return '<div class="table-wrap"><table data-group="'+group+'"><thead><tr>'+headers.map(label=>'<th scope="col">'+label+'</th>').join('')+'</tr></thead><tbody>'+rows.map((row,index)=>'<tr data-index="'+index+'">'+row.map(value=>'<td>'+value+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
}
const cash = (label,key,value,negative=false) => input(label,key,value,'number','step="0.01" '+(negative?'':'min="0"'));
function renderBudget() {
  $('settings').innerHTML = [
    ['Take-home pay per payment',cash('Take-home pay per payment','pay',state.pay)],
    ['Pay frequency',select('Pay frequency','cadence',state.cadence,Object.keys(Ledger.frequencies).filter(key=>key!=='One-time'))],
    ['Monthly savings target',cash('Monthly savings target','target',state.target)],
  ].map(([label,control])=>'<label>'+label+control+'</label>').join('');
  $('gyms').innerHTML = Ledger.gymOptions.map(gym=>'<label class="gym-option"><input type="radio" name="gym" value="'+gym.id+'"'+(state.gym===gym.id?' checked':'')+'><span>'+gym.name+'</span><small>'+fmt(Ledger.gymMonthly(gym))+' / month average'+(gym.fee?' · includes annual fee':'')+'</small></label>').join('');
  $('budget-table').innerHTML = editTable(['Item','Category','Type','Frequency','Amount','Due month','Monthly plan',''],Ledger.report(state).budget.map(row=>[
    input('Item','name',row.name,'text','class="wide" maxlength="120"'),input('Category','category',row.category,'text','maxlength="120"'),
    select('Budget type','type',row.type,['Expense','Savings transfer']),
    select('Frequency','cadence',row.cadence,Object.keys(Ledger.frequencies)),
    cash('Amount','amount',row.amount),row.cadence==='One-time'?input('Due month','due',row.due,'month'):'—',
    fmt(row.monthly),removeButton('budget item'),
  ]),'Your budget is empty. Add a recurring bill, one-time cost or savings transfer.','budget');
}
function renderTransactions() {
  const names = [...new Set(['Fitness',...state.budget.map(row=>row.category).filter(Boolean)])];
  $('category-list').innerHTML = names.map(name=>'<option value="'+esc(name)+'"></option>').join('');
  const goals = [['','Choose a goal'],...state.goals.map(row=>[row.id,row.name||'Unnamed goal'])];
  $('transactions-table').innerHTML = editTable(['Date','Type','Category','Amount','Savings goal','Notes',''],state.transactions.map(row=>[
    input('Date','date',row.date,'date'),select('Transaction type','type',row.type,Ledger.transactionTypes),
    input('Category','category',row.category,'text','list="category-list" maxlength="120"'),cash('Amount','amount',row.amount,true),
    ['Savings transfer','Savings withdrawal','Fund expense'].includes(row.type)?select('Savings goal','goal',row.goal,goals):'—',
    input('Notes','notes',row.notes,'text','class="wide" maxlength="300"'),removeButton('transaction'),
  ]),'No transactions yet. Add income, expenses or a transfer.','transactions');
}
function renderGoals() {
  $('goals-table').innerHTML = editTable(['Goal','Target balance','Opening balance','Balance this month','Progress',''],Ledger.report(state).goalRows.map(row=>[
    row.id==='general'?'General savings':input('Goal name','name',row.name,'text','class="wide" maxlength="120"'),
    cash('Target balance','target',row.target),cash('Opening balance','opening',row.opening,true),fmt(row.balance),rate(row.progress),row.id==='general'?'':removeButton('goal'),
  ]),'Add a savings goal to track its balance.','goals');
}
const render = {budget:renderBudget,transactions:renderTransactions,goals:renderGoals};
function refreshDerived(group,tr) {
  const index = Number(tr.dataset.index);
  const report = Ledger.report(state);
  if(group==='budget') tr.cells[6].textContent=fmt(report.budget[index].monthly);
  if(group==='goals'){
    const goal=report.goalRows[index];
    tr.cells[3].textContent=fmt(goal.balance);
    tr.cells[4].textContent=rate(goal.progress);
  }
}
document.addEventListener('input',event=>{
  const field = event.target;
  if(!field.dataset.field || field.tagName==='SELECT') return;
  if(field.validity.badInput || field.validity.rangeUnderflow || field.validity.stepMismatch) return;
  const tr = field.closest('tr[data-index]');
  const key = field.dataset.field;
  if(tr){
    const group = tr.closest('table').dataset.group;
    state[group][Number(tr.dataset.index)][key]=field.value;
    refreshDerived(group,tr);
  }else state[key]=field.value;
  update();
});
document.addEventListener('change',event=>{
  const field = event.target;
  if(field.id==='month'){
    if(field.value){state.month=field.value;persist();go();}
    else field.value=state.month;
    return;
  }
  if(field.name==='gym'){
    state.gym=field.value;
    update();
    return;
  }
  if(field.tagName!=='SELECT'||!field.dataset.field) return;
  const tr=field.closest('tr[data-index]');
  const key=field.dataset.field;
  if(!tr) state[key]=field.value;
  else {
    const group=tr.closest('table').dataset.group;
    const row=state[group][Number(tr.dataset.index)];
    row[key]=field.value;
    if(group==='transactions' && key==='type' && ['Income','Expense'].includes(row.type)) row.goal='';
    if((group==='budget' && key==='cadence') || (group==='transactions' && key==='type')){
      const index=tr.dataset.index;
      render[group]();
      document.querySelector('[data-group="'+group+'"] [data-index="'+index+'"] [data-field="'+key+'"]')?.focus();
    }else refreshDerived(group,tr);
  }
  update();
});
document.addEventListener('click',event=>{
  const button=event.target.closest('button');
  if(!button) return;
  if(button.dataset.page) location.hash=button.dataset.page;
  if(button.dataset.add) {
    const group=button.dataset.add;
    const next={
      budget:{name:'',category:'',type:'Expense',cadence:'Monthly',amount:'',due:state.month},
      transactions:{date:state.month+'-01',type:'Expense',category:'',amount:'',goal:'',notes:''},
      goals:{id:globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36)+Math.random().toString(36).slice(2),name:'',target:'',opening:''},
    };
    state[group].push(next[group]);
    update();render[group]();
    document.querySelector('[data-group="'+group+'"] tr:last-child input')?.focus();
  }
  if(button.hasAttribute('data-remove')){
    const tr=button.closest('tr');
    const group=tr.closest('table').dataset.group;
    const index=Number(tr.dataset.index);
    if(group==='goals' && state.transactions.some(row=>row.goal===state.goals[index].id)){
      alert('This goal has linked transactions. Move those transactions to another goal before removing it.');
      return;
    }
    state[group].splice(index,1);
    update();render[group]();
    document.querySelector('[data-add="'+group+'"]')?.focus();
  }
});
$('start').addEventListener('click',()=>{
  const month=state.month;
  state=Ledger.starter(false);
  state.month=month;
  update();location.hash='budget';go();
  $('settings').querySelector('input').focus();
});
$('download').addEventListener('click',async()=>{
  $('download').disabled=true;
  $('feedback').textContent='Preparing workbook…';
  try {
    const data=await LedgerExcel.create(state);
    const url=URL.createObjectURL(data);
    const link=document.createElement('a');
    link.href=url;
    link.download='Ledger-'+state.month+'.xlsx';
    link.click();
    setTimeout(()=>URL.revokeObjectURL(url),2000);
    $('feedback').textContent='Excel workbook downloaded.';
  } catch(error){
    console.error(error);
    $('feedback').textContent='Could not create the workbook. Try downloading again.';
  } finally {
    $('download').disabled=false;
  }
});
$('month').value=state.month;
$('sample').hidden=!state.sample;
persist();
go();
window.addEventListener('hashchange',go);
