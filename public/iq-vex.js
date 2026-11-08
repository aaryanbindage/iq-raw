// Completes the IQ2 block families: console, vision, pneumatics, data and controls.
(() => {
  const py=Blockly.Python,cp=Blockly.Cpp,specs=[];
  const ports=Array.from({length:12},(_,i)=>[String(i+1),String(i+1)]);
  const N=(name,value=0)=>({type:'input_value',name,check:'Number',value});
  const T=(name,text='Hello')=>({type:'input_value',name,check:'String',text});
  const A=(name,value=0)=>({type:'input_value',name,value});
  const B=name=>({type:'input_value',name,check:'Boolean'});
  const D=(name,options)=>({type:'field_dropdown',name,options:options.map(v=>Array.isArray(v)?v:[v,v])});
  const P=()=>D('PORT',ports);
  const F=(name,value=0,min,max)=>({type:'field_number',name,value,min,max});
  const NAME=(name='NAME',text='my_data')=>({type:'field_input',name,text});
  const DO={type:'input_statement',name:'DO'};
  const v=(b,g,name,fallback='0')=>g.valueToCode(b,name,g.ORDER_NONE)||fallback;
  const ident=x=>String(x||'data').replace(/[^A-Za-z0-9_]/g,'_');
  const isString=(b,name)=>b.getInputTargetBlock(name)?.outputConnection?.getCheck()?.includes('String') || ['text','text_join'].includes(b.getInputTargetBlock(name)?.type);
  const end=l=>l==='py'?'\n':';\n';
  const truth=(l,value)=>l==='py'?(value?'True':'False'):(value?'true':'false');
  const pyCommon=`import math

iqv_screen_precision=[2]
iqv_console_precision=[2]
iqv_answer=['']
iqv_controller_enabled=[True]
iqv_monitoring={}

def iqv_monitor_emit(name,value,hide=False):
    clean=lambda s: str(s).replace('\\t',' ').replace('\\r',' ').replace('\\n',' ')[:256]
    print('\\x1eIQRAW_'+('HIDE' if hide else 'MONITOR')+'\\t'+clean(name)+('' if hide else '\\t'+clean(value)))

def iqv_text(value):
    return str(value)

def iqv_print(value, screen, newline):
    precision=(iqv_screen_precision if screen else iqv_console_precision)[0]
    text=str(value) if isinstance(value,str) or precision<0 else (('%.'+str(precision)+'f') % value)
    if screen:
        brain.screen.print(text)
        if newline: brain.screen.next_row()
    else: print(text,end='\\n' if newline else '')

def iqv_ask(prompt):
    iqv_answer[0]=input(str(prompt))

def iqv_number(text):
    try: return float(text)
    except (ValueError,TypeError): return float('nan')

def iqv_letter(text,index):
    if not math.isfinite(index) or index!=int(index) or index<1 or index>len(text): return ''
    return text[int(index)-1]

def iqv_map(x,a,b,c,d):
    return float('nan') if a==b else c+(x-a)*(d-c)/(b-a)

def iqv_matrix(rows,cols,fill):
    if not all(math.isfinite(x) and x==int(x) and 0<=x<=64 for x in (rows,cols)) or rows*cols>4096: return [0,0,[]]
    return [int(rows),int(cols),[str(fill)]*int(rows*cols)]

def iqv_cell(table,row,col):
    if not all(math.isfinite(x) and x==int(x) for x in (row,col)) or not (1<=row<=table[0] and 1<=col<=table[1]): return -1
    return (int(row)-1)*table[1]+int(col)-1

def iqv_get(table,row,col):
    index=iqv_cell(table,row,col)
    return table[2][index] if index>=0 else ''

def iqv_set(table,row,col,value):
    index=iqv_cell(table,row,col)
    if index>=0: table[2][index]=str(value)

def iqv_object(objects,index,prop):
    if not math.isfinite(index) or index!=int(index) or index<1 or index>len(objects): return 0
    return getattr(objects[int(index)-1],prop,0)
`;
  const cppCommon=`#include <string>
#include <vector>
#include <stdio.h>
#include <string.h>
#include <atomic>
int iqv_screen_precision=2,iqv_console_precision=2;
std::string iqv_answer;
bool iqv_controller_enabled=true;
std::string iqv_text(const char *s){return s?std::string(s):std::string();}
std::string iqv_text(double x){char b[64];snprintf(b,sizeof(b),"%.15g",x);return std::string(b);}
std::string iqv_text(int x){return iqv_text((double)x);}
std::string iqv_monitor_clean(const char *s){std::string t=iqv_text(s).substr(0,256);for(auto &c:t)if(c=='\\t'||c=='\\r'||c=='\\n')c=' ';return t;}
void iqv_monitor_emit(const char *name,const char *value,bool hide=false){auto n=iqv_monitor_clean(name),v=iqv_monitor_clean(value);printf(hide?"\\036IQRAW_HIDE\\t%s\\n":"\\036IQRAW_MONITOR\\t%s\\t%s\\n",n.c_str(),v.c_str());fflush(stdout);}
void iqv_print(const char *s,bool screen,bool newline){if(screen){Brain.Screen.print("%s",s);if(newline)Brain.Screen.newLine();}else printf(newline?"%s\\n":"%s",s);}
void iqv_print(double x,bool screen,bool newline){char b[80];int p=screen?iqv_screen_precision:iqv_console_precision;if(p<0)snprintf(b,sizeof(b),"%.15g",x);else snprintf(b,sizeof(b),"%.*f",p,x);iqv_print(b,screen,newline);}
void iqv_print(int x,bool screen,bool newline){iqv_print((double)x,screen,newline);}
void iqv_ask(const char *prompt){printf("%s",prompt);fflush(stdout);iqv_answer.clear();int c;while((c=getchar())!='\\n'&&c!=EOF){if(c!='\\r'&&iqv_answer.size()<1024)iqv_answer.push_back((char)c);} }
double iqv_number(const char *s){char *e=nullptr;double v=strtod(s,&e);if(e==s)return NAN;while(*e==' '||*e=='\\t')++e;return *e?NAN:v;}
std::string iqv_letter(const char *s,double index){std::string t=iqv_text(s);return isfinite(index)&&index==trunc(index)&&index>=1&&index<=t.size()?t.substr((size_t)index-1,1):std::string();}
double iqv_map(double x,double a,double b,double c,double d){return a==b?NAN:c+(x-a)*(d-c)/(b-a);}
struct IQTable {int rows=0,cols=0;std::vector<std::string> data;};
IQTable iqv_matrix(double r,double c,const char *fill){IQTable t;if(!isfinite(r)||!isfinite(c)||r!=trunc(r)||c!=trunc(c)||r<0||c<0||r>64||c>64||r*c>4096)return t;t.rows=(int)r;t.cols=(int)c;t.data.assign(t.rows*t.cols,iqv_text(fill));return t;}
int iqv_cell(const IQTable&t,double r,double c){return isfinite(r)&&isfinite(c)&&r==trunc(r)&&c==trunc(c)&&r>=1&&r<=t.rows&&c>=1&&c<=t.cols?((int)r-1)*t.cols+(int)c-1:-1;}
const char *iqv_get(const IQTable&t,double r,double c){int i=iqv_cell(t,r,c);return i>=0?t.data[i].c_str():"";}
void iqv_set(IQTable&t,double r,double c,const char *s){int i=iqv_cell(t,r,c);if(i>=0)t.data[i]=iqv_text(s);}
double iqv_vision_prop(vex::vision &dev,double index,int prop){if(!isfinite(index)||index!=trunc(index)||index<1||index>dev.objectCount)return 0;const auto&o=dev.objects[(int)index-1];switch(prop){case 0:return o.exists;case 1:return o.width;case 2:return o.height;case 3:return o.centerX;case 4:return o.centerY;case 5:return o.angle;case 6:return o.originX;case 7:return o.originY;}return 0;}
double iqv_ai_prop(vex::aivision &dev,double index,int prop){if(!isfinite(index)||index!=trunc(index)||index<1||index>dev.objectCount)return 0;const auto&o=dev.objects[(int)index-1];switch(prop){case 0:return o.exists;case 1:return o.width;case 2:return o.height;case 3:return o.centerX;case 4:return o.centerY;case 5:return o.angle;case 6:return o.originX;case 7:return o.originY;case 8:return o.id;case 9:return (int)o.type;case 10:return o.score;case 11:return o.width*o.height;}return 0;}
const char *iqv_ai_class(vex::aivision &dev,double index){if(!isfinite(index)||index!=trunc(index)||index<1||index>dev.objectCount)return "";return dev.objects[(int)index-1].className;}
`;
  function common(l,g){
    if(l==='py'){g.definitions_.import_vex='from vex import *';g.definitions_.brain='brain = Brain()';}
    g.definitions_.iqv_common=l==='py'?pyCommon:cppCommon;
  }
  function add(cat,id,label,args,output,emit,tip=''){
    specs.push({cat,id:'iqv_'+id,label,args,output,emit,tip});
  }
  const cfg=(l,name)=>l==='py'?`${name}[0]`:name;
  function device(l,b,g,kind){
    common(l,g);const p=b.getFieldValue('PORT'),name='iqv_'+kind+'_'+p;
    if(kind==='pneumatic')g.definitions_[name] ||= l==='py'?`${name}=Pneumatic(Ports.PORT${p})`:`vex::pneumatic ${name}(PORT${p},false);`;
    if(kind==='motor')g.definitions_[name] ||= l==='py'?`${name}=Motor(Ports.PORT${p},False)`:`vex::motor ${name}(PORT${p},false);`;
    if(kind==='vision'){
      const setup=b.workspace.getBlocksByType('iqv_vision_signature',true).filter(s=>s.getFieldValue('PORT')===p);
      const signatures=[...new Map(setup.map(s=>{const a=['ID','UMIN','UMAX','UMEAN','VMIN','VMAX','VMEAN','RANGE','TYPE'].map(f=>Number(s.getFieldValue(f)));return [a[0],{name:name+'_sig_'+a[0],args:a}];})).values()];
      const declarations=signatures.map(s=>l==='py'?`${s.name}=Signature(${s.args.join(',')})`:`vex::vision::signature ${s.name}(${s.args.join(',')});`);
      const sigs=[...new Set(signatures.map(s=>s.name))];
      g.definitions_[name]=declarations.join('\n')+'\n'+(l==='py'?`${name}=Vision(Ports.PORT${p},50${sigs.length?','+sigs.join(','):''})\n${name}_objects=[()]\n${name}_index=[1]`:`vex::vision ${name}(PORT${p},50${sigs.length?','+sigs.join(','):''});\ndouble ${name}_index=1;`);
    }
    if(kind==='ai'){
      const colors=b.workspace.getBlocksByType('iqv_ai_color',true).filter(s=>s.getFieldValue('PORT')===p);
      const args=[...new Map(colors.map(s=>{const a=['ID','R','G','B','HUE','SAT'].map(f=>Number(s.getFieldValue(f)));return [a[0],a];})).values()];
      const names=args.map(a=>name+'_color_'+a[0]);
      const declarations=args.map((a,i)=>l==='py'?`${names[i]}=Colordesc(${a.join(',')})`:`vex::aivision::colordesc ${names[i]}(${a.join(',')});`);
      const codes=b.workspace.getBlocksByType('iqv_ai_code',true).filter(s=>s.getFieldValue('PORT')===p);
      for(const code of [...new Map(codes.map(s=>[s.getFieldValue('ID'),s])).values()]){
        const id=Number(code.getFieldValue('ID')),ids=['C1','C2','C3','C4'].map(f=>Number(code.getFieldValue(f))).filter(Boolean),cname=name+'_code_'+id;
        declarations.push(l==='py'?`${cname}=Codedesc(${id},${ids.map(i=>`Colordesc(${i},0,0,0,0,0)`).join(',')})`:`vex::aivision::codedesc ${cname}(${id},${ids.join(',')});`);names.push(cname);
      }
      g.definitions_[name]=declarations.join('\n')+'\n'+(l==='py'?`${name}=AiVision(Ports.PORT${p}${names.length?','+names.join(','):''})\n${name}_objects=[()]\n${name}_index=[1]`:`vex::aivision ${name}(PORT${p}${names.length?','+names.join(','):''});\ndouble ${name}_index=1;`);
    }
    return name;
  }
  function controller(l,g){common(l,g);g.definitions_.controller=l==='py'?'controller = Controller()':'vex::controller Controller;';return l==='py'?'controller':'Controller';}
  const precision=D('DIGITS',[['1','0'],['0.1','1'],['0.01','2'],['0.001','3'],['all digits','-1']]);
  add('Console','print','console print %1 %2',[A('VALUE',1),D('NEWLINE',[['and next row','yes'],['same row','no']])],null,(l,b,g)=>`iqv_print(${v(b,g,'VALUE')},${truth(l,false)},${truth(l,b.getFieldValue('NEWLINE')==='yes')})${end(l)}`);
  add('Console','screen_print','screen print %1 %2',[A('VALUE',1),D('NEWLINE',[['and next row','yes'],['same row','no']])],null,(l,b,g)=>`iqv_print(${v(b,g,'VALUE')},${truth(l,true)},${truth(l,b.getFieldValue('NEWLINE')==='yes')})${end(l)}`);
  for(const [id,label,target]of [['console_precision','console','iqv_console_precision'],['screen_precision','screen','iqv_screen_precision']])add('Console',id,`set ${label} print precision %1`,[precision],null,(l,b)=>`${cfg(l,target)}=${b.getFieldValue('DIGITS')}${end(l)}`);
  add('Console','newline','console next row',[],null,l=>l==='py'?"print()\n":'printf("\\n");\n');
  add('Console','clear','console clear all rows',[],null,l=>l==='py'?"print('\\033[2J',end='')\n":'printf("\\033[2J");\n');
  add('Console','color','set console font colour %1',[D('COLOR',[['default','0'],['red','31'],['green','32'],['blue','34'],['yellow','33'],['orange','38;2;255;165;0'],['purple','35'],['white','37'],['black','30'],['red violet','38;2;199;21;133'],['violet','38;2;138;43;226'],['blue violet','38;2;75;0;130'],['blue green','36'],['yellow green','38;2;154;205;50'],['yellow orange','38;2;255;190;0'],['red orange','38;2;255;69;0']])],null,(l,b)=>l==='py'?`print('\x1b[${b.getFieldValue('COLOR')}m',end='')\n`:`printf("\\033[${b.getFieldValue('COLOR')}m");\n`);
  add('Console','ask','ask %1 and wait',[T('PROMPT','Your answer? ')],null,(l,b,g)=>`iqv_ask(${v(b,g,'PROMPT','""')})${end(l)}`,'Connect the live console before running. This waits for a line sent using the console input.');
  add('Console','answer','answer',[],'String',l=>l==='py'?'iqv_answer[0]':'iqv_answer.c_str()');
  add('Console','answer_number','answer as number',[],'Number',l=>l==='py'?'iqv_number(iqv_answer[0])':'iqv_number(iqv_answer.c_str())');
  add('Console','monitor','show monitor %1 value %2',[NAME('NAME','my_value'),A('VALUE')],null,(l,b,g)=>{
    const label=JSON.stringify(b.getFieldValue('NAME')),key='iqv_monitor_'+ident(b.getFieldValue('NAME'));
    const idx=b.workspace.getBlocksByType('iqv_monitor',true).indexOf(b),fn=key+'_watch_'+idx,value=v(b,g,'VALUE');
    if(l==='py'){
      g.definitions_[fn]=`def ${fn}():\n    while True:\n        if iqv_monitoring.get(${label},False): iqv_monitor_emit(${label},${value})\n        wait(250,MSEC)\n\n${fn}_started=[False]`;
      return `iqv_monitoring[${label}]=True\nif not ${fn}_started[0]:\n    ${fn}_started[0]=True\n    Thread(${fn})\n`;
    }
    g.definitions_[key] ||= `std::atomic<bool> ${key}(false);`;
    g.definitions_[fn]=`int ${fn}(){while(true){if(${key}.load())iqv_monitor_emit(${label},iqv_text(${value}).c_str());this_thread::sleep_for(250);}return 0;}`;
    return `${key}.store(true);\nstatic bool ${fn}_started=false;\nif(!${fn}_started){${fn}_started=true;thread ${fn}_thread(${fn});}\n`;
  },'Watch a global variable or sensor reporter in the live console, updated every 250 ms. Use a unique name for each monitor. Function parameters and local loop variables are not supported.');
  add('Console','monitor_hide','hide monitor %1',[NAME('NAME','my_value')],null,(l,b,g)=>{
    const label=JSON.stringify(b.getFieldValue('NAME')),key='iqv_monitor_'+ident(b.getFieldValue('NAME'));
    if(l==='cpp')g.definitions_[key] ||= `std::atomic<bool> ${key}(false);`;
    return l==='py'?`iqv_monitoring[${label}]=False\niqv_monitor_emit(${label},'',True)\n`:`${key}.store(false);\niqv_monitor_emit(${label},"",true);\n`;
  });

  add('Pneumatics','cylinder','pneumatic %1 cylinder %2 %3',[P(),D('CYL',[['1','CYLINDER1'],['2','CYLINDER2'],['all','CYLINDERALL']]),D('ACTION',['extend','retract'])],null,(l,b,g)=>`${device(l,b,g,'pneumatic')}.${b.getFieldValue('ACTION')}(${l==='py'?'CylinderType.':'cylinderType::'}${l==='py'?b.getFieldValue('CYL'):({CYLINDER1:'cylinder1',CYLINDER2:'cylinder2',CYLINDERALL:'cylinderAll'}[b.getFieldValue('CYL')])})${end(l)}`);
  add('Pneumatics','pump','pneumatic %1 pump %2',[P(),D('STATE',['on','off'])],null,(l,b,g)=>`${device(l,b,g,'pneumatic')}.${l==='py'?'pump_'+b.getFieldValue('STATE'):(b.getFieldValue('STATE')==='on'?'pumpOn':'pumpOff')}()${end(l)}`);
  function motorGroup(l,b,g){
    const key=ident(b.getFieldValue('NAME')),name='motor_group_'+key;
    const setup=b.workspace.getBlocksByType('iqv_group_setup',true).find(s=>ident(s.getFieldValue('NAME'))===key);
    const count=setup?Number(setup.getFieldValue('COUNT')):2;
    const ps=Array.from({length:count},(_,i)=>setup?setup.getFieldValue('P'+(i+1)):String(i===0?1:6));
    for(const p of ps)g.definitions_['motor_'+p] ||= l==='py'?`motor_${p}=Motor(Ports.PORT${p},False)`:`vex::motor motor_${p}(PORT${p},false);`;
    g.definitions_[name]=l==='py'?`${name}=MotorGroup(${ps.map(p=>'motor_'+p).join(',')})`:`vex::motor_group ${name}(${ps.map(p=>'motor_'+p).join(',')});`;
    return {name,key};
  }
  add('Motor groups','group_setup','motor group %1 motors %2 ports %3 %4 %5 %6',[NAME('NAME','drive'),D('COUNT',['2','4']),D('P1',ports),D('P2',ports),D('P3',ports),D('P4',ports)],null,(l,b,g)=>{motorGroup(l,b,g);return '';},'Choose two or four ports. Motor reversal follows the motor setup blocks.');
  for(const source of Blockly.IQ_SPECS.filter(s=>s.cat==='Motors')){
    const args=source.args.map(a=>a.t==='port'?NAME('NAME','drive'):a.t==='num'?N(a.name,a.def):a.t==='dd'?D(a.name,a.opts.map(o=>Array.isArray(o)?o:[String(o).replace(/^[^.]+\./,'').toLowerCase(),o])):a.t==='bool'?B(a.name):F(a.name,a.def));
    let ordinal=0;
    const label=source.msg.replace(/^motor /,'motor group ').replace(/\{\w+\}/g,()=>'%'+(++ordinal));
    add('Motor groups','group_'+source.id.replace(/^iq_/,''),label,args,source.kind==='n'?'Number':source.kind==='b'?'Boolean':null,(l,b,g)=>{
      const group=motorGroup(l,b,g),original=(l==='py'?py:cp).forBlock[source.id];
      const shim=new Proxy(b,{get(target,prop){if(prop==='getFieldValue')return field=>field==='PORT'?'group_'+group.key:target.getFieldValue(field);const value=target[prop];return typeof value==='function'?value.bind(target):value;}});
      const result=original(shim,g);return Array.isArray(result)?result[0]:result;
    });
  }
  add('Motor groups','group_stop','stop motor group %1',[NAME('NAME','drive')],null,(l,b,g)=>`${motorGroup(l,b,g).name}.stop()${end(l)}`);
  add('Control','forever','forever %1',[DO],null,(l,b,g)=>l==='py'?`while True:\n${g.statementToCode(b,'DO')||'    pass\n'}    wait(5,MSEC)\n`:`while(true){\n${g.statementToCode(b,'DO')}    this_thread::sleep_for(5);\n}\n`);
  add('Control','repeat_until','repeat until %1 %2',[B('COND'),DO],null,(l,b,g)=>l==='py'?`while not (${v(b,g,'COND','False')}):\n${g.statementToCode(b,'DO')||'    pass\n'}    wait(5,MSEC)\n`:`while(!(${v(b,g,'COND','false')})){\n${g.statementToCode(b,'DO')}    this_thread::sleep_for(5);\n}\n`);
  add('Control','stop_project','stop project',[],null,l=>l==='py'?'raise SystemExit\n':'vexSystemExitRequest();\n', 'Stops the entire project on the brain.');
  add('Control','comment','comment %1',[NAME('TEXT','Explain this step')],null,(l,b)=>String(b.getFieldValue('TEXT')).split(/\r?\n/).map(t=>(l==='py'?'# ':'// ')+t+'\n').join(''));
  add('Switch','switch_bool','raw Boolean %1',[NAME('CODE','True')],'Boolean',(l,b)=>`(${b.getFieldValue('CODE')==='True'&&l==='cpp'?'true':b.getFieldValue('CODE')})`,'Code is copied as written. Use the selected program language.');
  add('Switch','switch_number','raw number %1',[NAME('CODE','0')],'Number',(l,b)=>`(${b.getFieldValue('CODE')})`);
  add('Switch','switch_hat','when started raw code %1 then %2',[NAME('CODE',''),DO],null,(l,b,g)=>b.getFieldValue('CODE')+'\n'+g.statementToCode(b,'DO').replace(/^    /gm,''));
  add('Operators','remainder','remainder %1 ÷ %2',[N('A',7),N('B',3)],'Number',(l,b,g)=>l==='py'?`((${v(b,g,'A')}) % (${v(b,g,'B','1')}))`:`fmod(fmod(${v(b,g,'A')},${v(b,g,'B','1')})+(${v(b,g,'B','1')}),${v(b,g,'B','1')})`);
  add('Operators','join','join %1 and %2',[A('A'),A('B')],'String',(l,b,g)=>l==='py'?`(str(${v(b,g,'A')})+str(${v(b,g,'B')}))`:`(iqv_text(${v(b,g,'A')})+iqv_text(${v(b,g,'B')})).c_str()`);
  add('Operators','letter','letter %1 of %2',[N('INDEX',1),T('TEXT','hello')],'String',(l,b,g)=>`iqv_letter(${v(b,g,'TEXT','""')},${v(b,g,'INDEX','1')})${l==='py'?'':'.c_str()'}`,'Positions start at 1. Outside the text returns empty text. C++ string indexing uses UTF-8 bytes.');
  add('Operators','length','length of %1',[T('TEXT','hello')],'Number',(l,b,g)=>l==='py'?`len(${v(b,g,'TEXT','""')})`:`strlen(${v(b,g,'TEXT','""')})`);
  add('Operators','contains','%1 contains %2',[T('TEXT','hello'),T('PART','ell')],'Boolean',(l,b,g)=>l==='py'?`((${v(b,g,'PART','""')}) in (${v(b,g,'TEXT','""')}))`:`(iqv_text(${v(b,g,'TEXT','""')}).find(${v(b,g,'PART','""')})!=std::string::npos)`);
  add('Operators','to_text','convert %1 to text',[A('VALUE',1)],'String',(l,b,g)=>`iqv_text(${v(b,g,'VALUE')})${l==='py'?'':'.c_str()'}`);
  add('Operators','to_number','convert %1 to number',[T('VALUE','42')],'Number',(l,b,g)=>`iqv_number(${v(b,g,'VALUE','""')})`);
  add('Useful','map','map %1 from %2 … %3 to %4 … %5',[N('X',50),N('A'),N('B',100),N('C'),N('D',1)],'Number',(l,b,g)=>`iqv_map(${['X','A','B','C','D'].map(n=>v(b,g,n)).join(',')})`);
  add('Useful','clamp','clamp %1 between %2 and %3',[N('X',150),N('LO'),N('HI',100)],'Number',(l,b,g)=>l==='py'?`max(${v(b,g,'LO')},min(${v(b,g,'HI')},${v(b,g,'X')}))`:`fmax(${v(b,g,'LO')},fmin(${v(b,g,'HI')},${v(b,g,'X')}))`);
  add('Useful','deadband','deadband %1 within ± %2',[N('X',5),N('LIMIT',10)],'Number',(l,b,g)=>l==='py'?`(0 if abs(${v(b,g,'X')})<=abs(${v(b,g,'LIMIT')}) else (${v(b,g,'X')}))`:`(fabs(${v(b,g,'X')})<=fabs(${v(b,g,'LIMIT')})?0:(${v(b,g,'X')}))`);
  add('Controller','enable','controller configured actions %1',[D('STATE',['enable','disable'])],null,(l,b)=>`${cfg(l,'iqv_controller_enabled')}=${truth(l,b.getFieldValue('STATE')==='enable')}${end(l)}`,'Enables/disables controller drive-step blocks. Raw joystick/button reads and event callbacks remain active.');
  add('Controller','drive_step','controller tank step left port %1 axis %2 right port %3 axis %4',[D('LP',ports),D('LA',['A','B','C','D']),D('RP',ports),D('RA',['A','B','C','D'])],null,(l,b,g)=>{
    const ctl=controller(l,g),enabled=cfg(l,'iqv_controller_enabled');
    const lines=[];
    for(const side of ['L','R']){const p=b.getFieldValue(side+'P'),name='motor_'+p;g.definitions_[name] ||=l==='py'?`${name}=Motor(Ports.PORT${p},False)`:`vex::motor ${name}(PORT${p},false);`;const axis=`${ctl}.${l==='py'?'axis':'Axis'}${b.getFieldValue(side+'A')}.position()`;lines.push(l==='py'?`${name}.spin(FORWARD,${axis} if ${enabled} else 0,PERCENT)\n`:`${name}.spin(forward,${enabled}?${axis}:0,percent);\n`);}
    return lines.join('');
  },'Call this inside a loop. Disable stops the configured motors on the next step. Configure reversal using motor setup blocks.');

  function named(l,b,g,type){const name='iqv_'+type+'_'+ident(b.getFieldValue('NAME'));g.definitions_[name] ||=l==='py'?`${name}=${type==='bool'?'[False]':'[0,0,[]]'}`:`${type==='bool'?'bool':'IQTable'} ${name}${type==='bool'?'=false':''};`;return name;}
  add('Data','bool_get','Boolean variable %1',[NAME()],'Boolean',(l,b,g)=>cfg(l,named(l,b,g,'bool')));
  add('Data','bool_set','set Boolean %1 to %2',[NAME(),B('VALUE')],null,(l,b,g)=>`${cfg(l,named(l,b,g,'bool'))}=${v(b,g,'VALUE',truth(l,false))}${end(l)}`);
  for(const dim of [1,2]){
    const cat=dim===1?'Lists':'2D lists';
    add(cat,'table_create'+dim,`set ${dim===1?'list':'2D list'} %1 ${dim===1?'length %2 filled with %3':'rows %2 columns %3 filled with %4'}`,[NAME(),...(dim===1?[N('COLS',5)]:[N('ROWS',3),N('COLS',3)]),A('FILL')],null,(l,b,g)=>{
      const fill=v(b,g,'FILL');return `${named(l,b,g,'table')}=iqv_matrix(${dim===1?'1':v(b,g,'ROWS')},${v(b,g,'COLS')},${l==='py'?'str':'iqv_text'}(${fill})${l==='py'?'':'.c_str()'})${end(l)}`;
    },'List positions start at 1. Lists support up to 64 columns; 2D lists up to 64 × 64 cells.');
    add(cat,'table_get'+dim,`${dim===1?'list':'2D list'} %1 ${dim===1?'item %2 as %3':'row %2 column %3 as %4'}`,[NAME(),...(dim===1?[]:[N('ROW',1)]),N('COL',1),D('AS',['number','text'])],null,()=> '');
    // The output shape follows the selected conversion, via a dedicated numeric/text reporter pair.
    specs.pop();
    for(const as of ['number','text'])add(cat,'table_get'+dim+'_'+as,`${dim===1?'list':'2D list'} %1 ${dim===1?'item %2':'row %2 column %3'} as ${as}`,[NAME(),...(dim===1?[]:[N('ROW',1)]),N('COL',1)],as==='number'?'Number':'String',(l,b,g)=>{const raw=`iqv_get(${named(l,b,g,'table')},${dim===1?'1':v(b,g,'ROW')},${v(b,g,'COL')})`;return as==='number'?`iqv_number(${raw})`:raw;});
    add(cat,'table_set'+dim,`replace ${dim===1?'list':'2D list'} %1 ${dim===1?'item %2 with %3':'row %2 column %3 with %4'}`,[NAME(),...(dim===1?[]:[N('ROW',1)]),N('COL',1),A('VALUE')],null,(l,b,g)=>`iqv_set(${named(l,b,g,'table')},${dim===1?'1':v(b,g,'ROW')},${v(b,g,'COL')},${l==='py'?'str':'iqv_text'}(${v(b,g,'VALUE')})${l==='py'?'':'.c_str()'})${end(l)}`);
    add(cat,'table_size'+dim,`${dim===1?'length of list':'size of 2D list'} %1${dim===1?'':' %2'}`,[NAME(),...(dim===1?[]:[D('AXIS',['rows','columns'])])],'Number',(l,b,g)=>{const name=named(l,b,g,'table'),rows=dim===2&&b.getFieldValue('AXIS')==='rows';return l==='py'?`${name}[${rows?0:1}]`:`${name}.${rows?'rows':'cols'}`;});
  }
  add('Lists','list_items','set list %1 items %2 %3 %4',[NAME(),A('A',1),A('B',2),A('C',3)],null,(l,b,g)=>{
    const name=named(l,b,g,'table'),str=l==='py'?'str':'iqv_text';
    return `${name}=iqv_matrix(1,3,"")${end(l)}`+['A','B','C'].map((n,i)=>`iqv_set(${name},1,${i+1},${str}(${v(b,g,n)})${l==='py'?'':'.c_str()'})${end(l)}`).join('');
  },'Initialize three items, including text or numeric values. Use the length/fill block for a larger list.');
  add('2D lists','matrix_items','set 2D list %1 2 × 2 items %2 %3 %4 %5',[NAME(),A('A',1),A('B',2),A('C',3),A('D',4)],null,(l,b,g)=>{
    const name=named(l,b,g,'table'),str=l==='py'?'str':'iqv_text';
    return `${name}=iqv_matrix(2,2,"")${end(l)}`+['A','B','C','D'].map((n,i)=>`iqv_set(${name},${Math.floor(i/2)+1},${i%2+1},${str}(${v(b,g,n)})${l==='py'?'':'.c_str()'})${end(l)}`).join('');
  });

  add('Vision','vision_signature','vision %1 signature %2 U min %3 max %4 mean %5 V min %6 max %7 mean %8 range %9 type %10',[P(),F('ID',1,1,7),F('UMIN'),F('UMAX'),F('UMEAN'),F('VMIN'),F('VMAX'),F('VMEAN'),F('RANGE',3),F('TYPE',0)],null,(l,b,g)=>{device(l,b,g,'vision');return '';},'Paste the numbers from VEX Vision Utility’s exported Signature. This statically configures the sensor at startup.');
  add('Vision','vision_snapshot','vision %1 take snapshot signature / code ID %2',[P(),N('ID',1)],null,(l,b,g)=>{const name=device(l,b,g,'vision');return l==='py'?`${name}_objects[0]=${name}.take_snapshot(int(${v(b,g,'ID')}),16)\n`:`${name}.takeSnapshot((uint32_t)(${v(b,g,'ID')}),16);\n`;},'Use a configured signature ID or the numeric ID of an exported color code. Configure signatures with the Vision Utility or signature setup blocks.');
  add('Vision','vision_code','vision %1 snapshot colour code signatures %2 %3 %4 %5',[P(),F('C1',1,1,7),F('C2',2,1,7),F('C3',0,0,7),F('C4',0,0,7)],null,(l,b,g)=>{
    const name=device(l,b,g,'vision'),ids=['C1','C2','C3','C4'].map(f=>Number(b.getFieldValue(f))).filter(Boolean),cname=name+'_code_'+ids.join('_');
    g.definitions_[cname]=l==='py'?`${cname}=Code(${ids.map(i=>`Signature(${i},0,0,0,0,0,0,3,1)`).join(',')})`:`vex::vision::code ${cname}(${ids.join(',')});`;
    return l==='py'?`${name}_objects[0]=${name}.take_snapshot(${cname},16)\n`:`${name}.takeSnapshot(${cname},16);\n`;
  },'Signatures must be calibrated as color-code signatures in the Vision Utility. Optional third and fourth IDs may be 0.');
  add('AI Vision','ai_color','AI vision %1 colour %2 RGB %3 %4 %5 hue range %6 saturation range %7',[P(),F('ID',1,1,7),F('R',255,0,255),F('G',0,0,255),F('B',0,0,255),F('HUE',10),F('SAT',0.2)],null,(l,b,g)=>{device(l,b,g,'ai');return '';},'Paste a Colordesc from the AI Vision Utility. Model and AprilTag configuration remains in that utility.');
  add('AI Vision','ai_code','AI vision %1 colour code %2 signatures %3 %4 %5 %6',[P(),F('ID',1,1,8),F('C1',1,1,7),F('C2',2,1,7),F('C3',0,0,7),F('C4',0,0,7)],null,(l,b,g)=>{device(l,b,g,'ai');return '';},'Configure the component colors in the AI Vision Utility or with color setup blocks. Optional third/fourth IDs may be 0.');
  add('AI Vision','ai_snapshot','AI vision %1 get %2 object data ID %3',[P(),D('TYPE',['colors','codes','tags','models','all']),N('ID',0)],null,(l,b,g)=>{
    const name=device(l,b,g,'ai'),id=v(b,g,'ID'),type=b.getFieldValue('TYPE');
    if(l==='cpp')return `${name}.takeSnapshot((uint32_t)(${id}),vex::aivision::objectType::${{colors:'colorObject',codes:'codeObject',tags:'tagObject',models:'modelObject',all:'allObject'}[type]},24);\n`;
    const desc={colors:`Colordesc(int(${id}),0,0,0,0,0)`,codes:`Codedesc(int(${id}),AiVision.ALL_COLORS,AiVision.ALL_COLORS)`,tags:`Tagdesc(int(${id}))`,models:`AiObjdesc(int(${id}))`,all:'AiVision.ALL_OBJECTS'}[type];
    return `${name}_objects[0]=${name}.take_snapshot(${desc},24)\n`;
  },'ID 0 selects all objects of the requested type. Enable the relevant detections in the AI Vision Utility or with detection blocks.');
  add('AI Vision','ai_detection','AI vision %1 %2 detection %3',[P(),D('TYPE',['color','tag','model']),D('STATE',['enable','disable'])],null,(l,b,g)=>`${device(l,b,g,'ai')}.${l==='py'?b.getFieldValue('TYPE')+'_detection':b.getFieldValue('TYPE')+'Detection'}(${truth(l,b.getFieldValue('STATE')==='enable')})${end(l)}`);
  const props=['exists','width','height','centerX','centerY','angle','originX','originY','id','type','score','area'];
  function objectProp(l,b,g,kind,prop){const name=device(l,b,g,kind),index=cfg(l,name+'_index');return l==='py'?`iqv_object(${name}_objects[0],${index},'${prop}')`:`iqv_${kind==='ai'?'ai':'vision'}_prop(${name},${index},${props.indexOf(prop)})`;}
  for(const [kind,cat]of [['vision','Vision'],['ai','AI Vision']]){
    add(cat,kind+'_index',`${cat} %1 set object index %2`,[P(),N('INDEX',1)],null,(l,b,g)=>`${cfg(l,device(l,b,g,kind)+'_index')}=${v(b,g,'INDEX')}${end(l)}`,'Objects are sorted largest first. Index 1 is the largest. An invalid index reports no object and zero properties.');
    add(cat,kind+'_count',`${cat} %1 object count`,[P()],'Number',(l,b,g)=>{const name=device(l,b,g,kind);return l==='py'?`len(${name}_objects[0])`:`${name}.objectCount`;});
    add(cat,kind+'_exists',`${cat} %1 selected object exists?`,[P()],'Boolean',(l,b,g)=>`(${objectProp(l,b,g,kind,'exists')} != 0)`);
    add(cat,kind+'_property',`${cat} %1 object %2`,[P(),D('PROP',kind==='ai'?props.slice(1):props.slice(1,8))],'Number',(l,b,g)=>objectProp(l,b,g,kind,b.getFieldValue('PROP')));
  }
  add('AI Vision','ai_class','AI vision %1 classification name',[P()],'String',(l,b,g)=>{const name=device(l,b,g,'ai'),index=cfg(l,name+'_index');return l==='py'?`str(iqv_object(${name}_objects[0],${index},'classname'))`:`iqv_ai_class(${name},${index})`;});
  add('AI Vision','ai_is_class','AI vision %1 object classification is %2',[P(),T('CLASS','BlueBall')],'Boolean',(l,b,g)=>{const name=device(l,b,g,'ai'),index=cfg(l,name+'_index');return l==='py'?`(iqv_object(${name}_objects[0],${index},'classname') == ${v(b,g,'CLASS','""')})`:`(iqv_text(iqv_ai_class(${name},${index})) == ${v(b,g,'CLASS','""')})`;});
  add('AI Vision','ai_tag','AI vision %1 selected object is AprilTag ID %2',[P(),N('ID',1)],'Boolean',(l,b,g)=>`((${objectProp(l,b,g,'ai','type')}) == 8 ${l==='py'?'and':'&&'} (${objectProp(l,b,g,'ai','id')}) == (${v(b,g,'ID')}))`);
  add('AI Vision','ai_tag_id','AI vision %1 AprilTag ID',[P()],'Number',(l,b,g)=>objectProp(l,b,g,'ai','id'));

  for(const s of specs){
    const args=s.args.map(({text,value,...a})=>a.type==='field_input'?{...a,text}:a.type==='field_number'?{...a,value}:a);
    const j={type:s.id,message0:s.label,args0:args,colour:({Console:190,Control:120,Switch:0,Operators:230,Useful:170,Controller:290,Vision:40,'AI Vision':40,Pneumatics:200,'Motor groups':20,Data:330,Lists:260,'2D lists':260})[s.cat],tooltip:s.tip,inputsInline:s.args.length<4};
    if(s.output)j.output=s.output;else{j.previousStatement=null;j.nextStatement=null;}
    if(s.id==='iqv_stop_project')delete j.nextStatement;
    if(s.id==='iqv_switch_hat'){delete j.previousStatement;delete j.nextStatement;j.extensions=['iq_start_hat'];}
    Blockly.defineBlocksWithJsonArray([j]);
    for(const[l,g]of[['py',py],['cpp',cp]])g.forBlock[s.id]=(b,gen)=>{common(l,gen);const code=s.emit(l,b,gen);return s.output?[code,gen.ORDER_ATOMIC]:code;};
  }
  // Fill the gaps in Blockly's standard text and numeric variable blocks for C++.
  cp.forBlock.text_join=(b,g)=>{common('cpp',g);const parts=Array.from({length:b.itemCount_},(_,i)=>`iqv_text(${v(b,g,'ADD'+i,'""')})`);return [`(${parts.join('+')||'std::string()'}).c_str()`,g.ORDER_ATOMIC];};
  cp.forBlock.math_change=(b,g)=>{const name='v_'+String(b.getField('VAR').getText()).replace(/[^A-Za-z0-9_]/g,'_');g.variables_.add(name);return `${name} += ${v(b,g,'DELTA')};\n`;};
  const categories=Blockly.IQ_TOOLBOX.contents;
  const tool=s=>({kind:'block',type:s.id,...(s.id==='iqv_group_setup'?{fields:{P1:'1',P2:'6',P3:'2',P4:'7'}}:s.id==='iqv_drive_step'?{fields:{LP:'1',RP:'6',LA:'A',RA:'D'}}:{}),inputs:Object.fromEntries(s.args.filter(a=>a.type==='input_value').map(a=>[a.name,{shadow:a.check==='String'?{type:'text',fields:{TEXT:a.text||''}}:a.check==='Boolean'?{type:'logic_boolean',fields:{BOOL:'TRUE'}}:{type:'math_number',fields:{NUM:a.value??0}}}]))});
  const group=(name,list)=>({kind:'category',name,colour:String(({Console:190,Vision:40,'AI Vision':40,Pneumatics:200,'Motor groups':20,Data:330,Lists:260,'2D lists':260,Useful:170,Switch:0,Operators:230})[name]||170),contents:list});
  for(const cat of ['Console','Pneumatics','Motor groups','Vision','AI Vision','Data','Lists','2D lists','Useful','Switch']) categories.push(group(cat,specs.filter(s=>s.cat===cat).map(tool)));
  categories.find(c=>c.name==='Loops').contents.push(...specs.filter(s=>s.cat==='Control').map(tool),{kind:'block',type:'controls_if',extraState:{hasElse:true}},{kind:'block',type:'controls_if',extraState:{elseIfCount:1,hasElse:true}});
  categories.find(c=>c.name==='Variables').custom='VARIABLE';
  categories.find(c=>c.name==='Controller').contents.push(...specs.filter(s=>s.cat==='Controller').map(tool));
  categories.find(c=>c.name==='Text').contents.push(...specs.filter(s=>s.cat==='Operators').map(tool));
  const vars=categories.find(c=>c.name==='Data');vars.contents.unshift({kind:'block',type:'math_change',inputs:{DELTA:{shadow:{type:'math_number',fields:{NUM:1}}}}});
  py.addReservedWords('iqv_answer,iqv_screen_precision,iqv_console_precision,iqv_controller_enabled,iqv_monitoring,iqv_monitor_emit,iqv_print,iqv_text,iqv_ask,iqv_number,iqv_map,iqv_matrix,iqv_get,iqv_set,iqv_cell,iqv_object,iqv_letter');
  Blockly.IQ_VEX={specs,pyCommon,cppCommon};
})();
