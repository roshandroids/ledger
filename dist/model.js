const Ledger = (() => {
  const frequencies = {Weekly:52, Biweekly:26, 'Twice monthly':24, Monthly:12, Quarterly:4, Annual:1, 'One-time':0};
  const gymOptions = [
    {id:'none', name:'Neither', rate:0, fee:0},
    {id:'fit', name:'Fit4Less Black', rate:13.99, fee:49.99},
    {id:'good', name:'GoodLife Corporate Premium', rate:30.74, fee:0},
  ];
  const transactionTypes = ['Income','Expense','Savings transfer','Savings withdrawal','Fund expense'];
  const spendingTypes = ['Expense', 'Fund expense'];
  const monthKey = (d = new Date()) => d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0');
  const cents = value => Math.round((value + Number.EPSILON) * 100) / 100;
  const gymMonthly = item => (cents(item.rate*1.13)*26+cents(item.fee*1.13))/12;
  const money = value => Number(value) || 0;
  const monthly = (amount, cadence, due, month) => cadence === 'One-time'
    ? (due === month ? money(amount) : 0)
    : money(amount) * (frequencies[cadence] || 0) / 12;
  const category = value => value.trim() || 'Uncategorized';

  function starter(sample = true) {
    const budget = sample ? [
      ['Rent & utilities','Housing',1190],
      ['Auto insurance','Transportation',188],
      ['Fuel & transit','Transportation',120],
      ['Groceries','Groceries',325],
      ['Phone plan','Phone',55],
      ['Dining out','Food & drink',155],
      ['Subscriptions','Personal',42],
      ['Vehicle reserve','Transportation',75,'Savings transfer'],
    ] : [];
    const month = monthKey();
    return {
      sample, month, pay:sample?2200:'', cadence:'Biweekly', target:sample?1500:'', gym:'none',
      budget:budget.map(([name,category,amount,type='Expense'])=>({name,category,amount,type,cadence:'Monthly',due:''})),
      transactions:[],
      goals:[{id:'general',name:'General savings',target:'',opening:''}],
    };
  }

  function report(state) {
    const activeGym = gymOptions.find(item=>item.id===state.gym) || gymOptions[0];
    const gym = gymMonthly(activeGym);
    const budget = state.budget.map(item=>({...item, monthly:monthly(item.amount,item.cadence,item.due,state.month)}));
    const valid = state.transactions.filter(row=>/^\d{4}-\d{2}-\d{2}$/.test(row.date) && row.amount !== '' && Number.isFinite(Number(row.amount)));
    const current = valid.filter(row=>row.date.startsWith(state.month+'-'));
    const active = current.length > 0;
    const sum = (rows,type,key='amount') => rows.filter(row=>row.type===type).reduce((total,row)=>total+money(row[key]),0);
    const movement = rows => sum(rows,'Savings transfer')-sum(rows,'Savings withdrawal')-sum(rows,'Fund expense');
    const goalRows = state.goals.map(goal=>{
      const net = movement(valid.filter(row=>row.goal===goal.id && row.date.slice(0,7)<=state.month));
      const balance = money(goal.opening)+net;
      return {...goal, net, balance, progress:money(goal.target)>0?balance/money(goal.target):null};
    });
    const planIncome = state.pay === '' ? null : monthly(state.pay,state.cadence,'',state.month);
    const planSpend = sum(budget,'Expense','monthly')+gym;
    const planSaved = sum(budget,'Savings transfer','monthly');
    const planCash = planIncome===null?null:planIncome-planSpend-planSaved;
    const actualIncome = current.some(row=>row.type==='Income') ? sum(current,'Income') : null;
    const actualSpend = sum(current,'Expense')+sum(current,'Fund expense');
    const actualSaved = movement(current);
    const actualCash = actualIncome===null?null:actualIncome-actualSpend-actualSaved;
    const general = movement(current.filter(row=>row.goal==='general'));
    const target = money(state.target);
    const groups = new Map();
    const add = (key,field,value) => {
      const name = category(key);
      const match = name.toLocaleLowerCase('en-CA');
      if(!groups.has(match)) groups.set(match,{name,planned:0,actual:0});
      groups.get(match)[field]+=value;
    };
    budget.filter(row=>row.type==='Expense' && (row.name || row.amount !== '')).forEach(row=>add(row.category,'planned',row.monthly));
    if(gym) add('Fitness','planned',gym);
    current.filter(row=>spendingTypes.includes(row.type)).forEach(row=>add(row.category,'actual',money(row.amount)));
    const breakdown=[...groups.values()].sort((a,b)=>b.planned-a.planned || b.actual-a.actual || a.name.localeCompare(b.name));
    return {
      activeGym,gym,budget,goalRows,breakdown,target,active,currentCount:current.length,
      planIncome,planSpend,planSaved,planCash,actualIncome,actualSpend,actualSaved,actualCash,general,
      planRate:planIncome>0?planSaved/planIncome:null,
      actualRate:actualIncome>0?actualSaved/actualIncome:null,
      afterTarget:planCash===null?null:planCash-target,
      leftToSave:Math.max(0,target-general),
    };
  }
  return {frequencies,gymOptions,transactionTypes,monthKey,gymMonthly,starter,report};
})();
