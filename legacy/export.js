const LedgerExcel = (() => {
  const mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  const office = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const packageNS = 'http://schemas.openxmlformats.org/package/2006';
  const sheetNS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  const xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  const escape = value => String(value??'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/g,'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;');
  const num = value => value === '' || value == null ? null : Number(value);
  const cell = (value,style=0,formula) => ({value,style,formula});
  const cash = (value,formula) => cell(num(value),2,formula);
  const percent = (value,formula) => cell(num(value),3,formula);
  const rel = (id,type,target) => '<Relationship Id="'+id+'" Type="'+office+'/'+type+'" Target="'+target+'"/>';
  const normalFont = '<font><sz val="11"/><color rgb="FF172337"/><name val="Calibri"/></font>';
  const headerFont = '<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>';

  function worksheet(rows,widths){
    const columns = widths.map((width,i)=>'<col min="'+(i+1)+'" max="'+(i+1)+'" width="'+width+'" customWidth="1"/>').join('');
    const content = rows.map((row,index)=>'<row r="'+(index+1)+'">'+row.map((item,i)=>{
      const address = String.fromCharCode(65+i)+(index+1);
      const {value,style,formula} = typeof item === 'object' && item !== null ? item : cell(item,index===0?1:0);
      const open = '<c r="'+address+'" s="'+style+'"';
      if(formula) return open+(typeof value==='number'?'':' t="str"')+'><f>'+escape(formula)+'</f><v>'+escape(value)+'</v></c>';
      if(typeof value==='number' && Number.isFinite(value)) return open+'><v>'+value+'</v></c>';
      if(value===null || value==='') return open+'/>';
      return open+' t="inlineStr"><is><t xml:space="preserve">'+escape(value)+'</t></is></c>';
    }).join('')+'</row>').join('');
    return xml+'<worksheet xmlns="'+sheetNS+'"><sheetViews><sheetView showGridLines="0" workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>'+columns+'</cols><sheetData>'+content+'</sheetData></worksheet>';
  }

  function create(state, outputType='blob'){
    const r=Ledger.report(state);
    const lookup = new Map(state.goals.map(goal=>[goal.id,goal.name]));
    const monthlyActual=(type)=>'SUMIF(Transactions!B:B,"'+type+'",Transactions!H:H)';
    const monthlyPlan=(type)=>'SUMIF(Budget!C:C,"'+type+'",Budget!G:G)';
    const isValid=row=>/^\d{4}-\d{2}-\d{2}$/.test(row.date) && row.amount!=='' && Number.isFinite(Number(row.amount));
    const actualFlag='COUNT(Transactions!H:H)';
    const summary=[
      ['Monthly summary (CAD)','Planned','Actual'],
      ['Report month',cell(state.month,0,'Settings!B2')],
      ['Take-home income',cash(r.planIncome,'IF(ISNUMBER(Settings!B3),Settings!B3*Settings!B5/12,"")'),cash(r.actualIncome,'IF(COUNTIFS(Transactions!B:B,"Income",Transactions!I:I,1),'+monthlyActual('Income')+',"")')],
      ['Spending',cash(r.planSpend,monthlyPlan('Expense')+'+Settings!B7'),cash(r.active?r.actualSpend:null,'IF('+actualFlag+','+monthlyActual('Expense')+'+'+monthlyActual('Fund expense')+',"")')],
      ['Net savings added',cash(r.planSaved,monthlyPlan('Savings transfer')),cash(r.active?r.actualSaved:null,'IF('+actualFlag+','+monthlyActual('Savings transfer')+'-'+monthlyActual('Savings withdrawal')+'-'+monthlyActual('Fund expense')+',"")')],
      ['Cash left before target',cash(r.planCash,'IF(ISNUMBER(B3),B3-B4-B5,"")'),cash(r.actualCash,'IF(ISNUMBER(C3),C3-C4-C5,"")')],
      ['Savings rate',percent(r.planRate,'IF(AND(ISNUMBER(B3),B3>0),B5/B3,"")'),percent(r.actualRate,'IF(AND(ISNUMBER(C3),C3>0),C5/C3,"")')],
      ['General savings target',cash(num(state.target),'IF(ISNUMBER(Settings!B6),Settings!B6,"")')],
      ['Planned cash after target',cash(r.afterTarget,'IF(ISNUMBER(B6),B6-N(B8),"")')],
      ['General savings added this month',null,cash(r.general,'SUMIFS(Transactions!H:H,Transactions!G:G,"general",Transactions!B:B,"Savings transfer")-SUMIFS(Transactions!H:H,Transactions!G:G,"general",Transactions!B:B,"Savings withdrawal")-SUMIFS(Transactions!H:H,Transactions!G:G,"general",Transactions!B:B,"Fund expense")')],
      ['Still needed for target',null,cash(r.leftToSave,'MAX(0,N(B8)-C10)')],
      [],
      ['Category','Planned spending','Actual spending','Plan remaining'].map(x=>cell(x,1)),
      ...r.breakdown.map(row=>[row.name,cash(row.planned),cash(r.active?row.actual:null),cash(r.active?row.planned-row.actual:null)]),
    ];
    const frequencyFormula = ref => Object.entries(Ledger.frequencies).reduceRight((next,[label,count])=>'IF('+ref+'="'+label+'",'+count+','+next+')','0');
    const settings=[
      ['Budget settings (CAD)','Value'],['Report month',state.month],['Take-home pay per payment',cash(state.pay)],
      ['Pay frequency',state.cadence],['Payments per year',cell(Ledger.frequencies[state.cadence],0,frequencyFormula('B4'))],['Monthly savings target',cash(state.target)],
      ['Gym monthly average',cash(r.gym)],['Gym choice',r.activeGym.name],['Ontario HST used for gym',percent(0.13)],
      ['Category breakdown shows figures at download.'],['Dates and months use ISO text.'],
    ];
    const budget=[
      ['Budget item','Category','Type','Frequency','Amount','Due month','Monthly plan','Payments per year'],
      ...r.budget.map((row,index)=>{
        const n=index+2;
        return [row.name,row.category,row.type,row.cadence,cash(row.amount),row.due,cash(row.monthly,'IF(D'+n+'="One-time",IF(F'+n+'=Settings!B2,N(E'+n+'),0),N(E'+n+')*H'+n+'/12)'),cell(Ledger.frequencies[row.cadence],0,frequencyFormula('D'+n))];
      }),
    ];
    const transactions=[
      ['Date','Type','Category','Amount','Savings goal','Notes','Goal ID','Selected month amount','In selected month','Through selected month'],
      ...state.transactions.map((row,index)=>{
        const n=index+2;
        const valid=isValid(row);
        const inMonth=valid&&row.date.startsWith(state.month+'-');
        return [row.date,row.type,row.category,cash(row.amount),lookup.get(row.goal)||'',row.notes,row.goal,
          cash(inMonth?row.amount:null,'IF(I'+n+'=1,D'+n+',"")'),
          cell(inMonth?1:0,0,'IF(AND(LEFT(A'+n+',7)=Settings!B2,LEN(A'+n+')=10,ISNUMBER(D'+n+')),1,0)'),
          cell(valid&&row.date.slice(0,7)<=state.month?1:0,0,'IF(AND(LEFT(A'+n+',7)<=Settings!B2,LEN(A'+n+')=10,ISNUMBER(D'+n+')),1,0)')];
      }),
    ];
    const goals=[
      ['Goal','Target balance','Opening balance','Net activity','Balance','Progress','Goal ID'],
      ...r.goalRows.map((row,index)=>{
        const n=index+2;
        const total=type=>'SUMIFS(Transactions!D:D,Transactions!G:G,G'+n+',Transactions!B:B,"'+type+'",Transactions!J:J,1)';
        return [row.name,cash(row.target),cash(row.opening),cash(row.net,total('Savings transfer')+'-'+total('Savings withdrawal')+'-'+total('Fund expense')),cash(row.balance,'N(C'+n+')+D'+n),percent(row.progress,'IF(B'+n+'>0,E'+n+'/B'+n+',"")'),row.id];
      }),
    ];
    const sheets=[
      ['Overview',summary,[38,22,22,20]],['Settings',settings,[55,39]],
      ['Budget',budget,[30,23,21,20,17,17,17,19]],['Transactions',transactions,[16,23,22,18,23,38,38,24,21,27]],
      ['Goals',goals,[28,17,17,17,17,16,39]],
    ];
    const zip=new JSZip();
    zip.file('[Content_Types].xml',xml+'<Types xmlns="'+packageNS+'/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'+sheets.map((_,i)=>'<Override PartName="/xl/worksheets/sheet'+(i+1)+'.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join('')+'</Types>');
    zip.file('_rels/.rels',xml+'<Relationships xmlns="'+packageNS+'/relationships">'+rel('rId1','officeDocument','xl/workbook.xml')+'</Relationships>');
    zip.file('xl/workbook.xml',xml+'<workbook xmlns="'+sheetNS+'" xmlns:r="'+office+'"><bookViews><workbookView/></bookViews><sheets>'+sheets.map(([name],i)=>'<sheet name="'+name+'" sheetId="'+(i+1)+'" r:id="rId'+(i+1)+'"/>').join('')+'</sheets><calcPr fullCalcOnLoad="1"/></workbook>');
    zip.file('xl/_rels/workbook.xml.rels',xml+'<Relationships xmlns="'+packageNS+'/relationships">'+sheets.map((_,i)=>rel('rId'+(i+1),'worksheet','worksheets/sheet'+(i+1)+'.xml')).join('')+rel('rId'+(sheets.length+1),'styles','styles.xml')+'</Relationships>');
    zip.file('xl/styles.xml',xml+'<styleSheet xmlns="'+sheetNS+'"><numFmts count="2"><numFmt numFmtId="164" formatCode="&quot;$&quot;#,##0.00;(&quot;$&quot;#,##0.00)"/><numFmt numFmtId="165" formatCode="0.0%"/></numFmts><fonts count="2">'+normalFont+headerFont+'</fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF203657"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="4"><xf xfId="0"/><xf xfId="0" fontId="1" fillId="2" applyFont="1" applyFill="1"/><xf xfId="0" numFmtId="164" applyNumberFormat="1"/><xf xfId="0" numFmtId="165" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>');
    sheets.forEach(([,rows,widths],i)=>zip.file('xl/worksheets/sheet'+(i+1)+'.xml',worksheet(rows,widths)));
    return zip.generateAsync({type:outputType,mimeType:mime,compression:'DEFLATE'});
  }
  return {create};
})();
