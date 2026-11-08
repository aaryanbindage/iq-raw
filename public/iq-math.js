// Advanced math and drawing for IQ2. Helpers are emitted only when used.
(() => {
  const PY = Blockly.Python, CPP = Blockly.Cpp;
  const realOps = ['sqrt', 'abs', 'ln', 'log10', 'exp', 'sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'asin', 'acos', 'atan', 'acot', 'asec', 'acsc', 'sinh', 'cosh', 'tanh', 'coth', 'sech', 'csch', 'asinh', 'acosh', 'atanh', 'acoth', 'asech', 'acsch'];
  const pyRuntime = {
    real: `def iqm_finite(x):
    return x == x and abs(x) < float('inf')

def iqm_real(op, x):
    try:
        if op == 0: return math.sqrt(x)
        if op == 1: return abs(x)
        if op == 2: return math.log(x)
        if op == 3: return math.log10(x)
        if op == 4: return math.exp(x)
        if op == 5: return math.sin(x)
        if op == 6: return math.cos(x)
        if op == 7: return math.tan(x)
        if op == 8: return 1.0 / math.tan(x)
        if op == 9: return 1.0 / math.cos(x)
        if op == 10: return 1.0 / math.sin(x)
        if op == 11: return math.asin(x)
        if op == 12: return math.acos(x)
        if op == 13: return math.atan(x)
        if op == 14: return math.atan2(1.0, x)
        if op == 15: return math.acos(1.0 / x)
        if op == 16: return math.asin(1.0 / x)
        if op == 17: return math.sinh(x)
        if op == 18: return math.cosh(x)
        if op == 19: return math.tanh(x)
        if op == 20: return 1.0 / math.tanh(x)
        if op == 21: return 1.0 / math.cosh(x)
        if op == 22: return 1.0 / math.sinh(x)
        if op == 23: return math.asinh(x)
        if op == 24: return math.acosh(x)
        if op == 25: return math.atanh(x)
        if op == 26: return math.atanh(1.0 / x)
        if op == 27: return math.acosh(1.0 / x)
        if op == 28: return math.asinh(1.0 / x)
    except (ValueError, ZeroDivisionError, OverflowError):
        pass
    return float('nan')

def iqm_power(x, y):
    try: return math.pow(x, y)
    except (ValueError, ZeroDivisionError, OverflowError): return float('nan')

def iqm_root(x, n):
    if not iqm_finite(n) or n == 0: return float('nan')
    if x < 0 and n == int(n) and int(n) % 2: return -iqm_power(-x, 1.0 / n)
    return iqm_power(x, 1.0 / n)

def iqm_round(x, digits, mode):
    if not iqm_finite(x) or not iqm_finite(digits): return float('nan')
    scale = math.pow(10, max(-12, min(12, int(digits))))
    v = x * scale
    if not iqm_finite(v): return float('nan')
    if mode == 0: v = math.floor(v + 0.5) if v >= 0 else math.ceil(v - 0.5)
    elif mode == 1: v = math.floor(v)
    elif mode == 2: v = math.ceil(v)
    else: v = int(v)
    return v / scale
`,
    calculus: `def iqm_eval(f, x):
    try: return float(f(x))
    except (ValueError, ZeroDivisionError, OverflowError): return float('nan')

def iqm_derivative(f, x, h, order):
    if not iqm_finite(x) or not iqm_finite(h) or h <= 0 or x + h == x or x - h == x: return float('nan')
    a, b = iqm_eval(f, x - h), iqm_eval(f, x + h)
    return (b - a) / (2 * h) if order == 1 else (b - 2 * iqm_eval(f, x) + a) / (h * h)

def iqm_integral(f, a, b, steps):
    if not all(iqm_finite(v) for v in (a, b, steps, b - a)) or steps < 2 or steps > 1024: return float('nan')
    n = int(steps)
    if n % 2: n += 1
    if a == b: return 0.0
    h = (b - a) / n
    total = iqm_eval(f, a) + iqm_eval(f, b)
    for k in range(1, n): total += (4 if k % 2 else 2) * iqm_eval(f, a + k * h)
    return total * h / 3

def iqm_series(f, a, b, product):
    if not iqm_finite(a) or not iqm_finite(b) or a != int(a) or b != int(b) or b - a + 1 > 4096 or abs(a) > 9007199254740991 or abs(b) > 9007199254740991: return float('nan')
    total = 1.0 if product else 0.0
    for k in range(int(a), int(b) + 1):
        v = iqm_eval(f, k)
        total = total * v if product else total + v
    return total
`,
    complex: `def iqm_complex_op(op, a, b):
    try:
        if op == 0: return a + b
        if op == 1: return a - b
        if op == 2: return a * b
        if op == 3: return a / b
        if op == 4: return a ** b
    except (ValueError, ZeroDivisionError, OverflowError): pass
    return complex(float('nan'), float('nan'))

def iqm_complex_fn(op, z):
    try:
        if op == 0: return cmath.sqrt(z)
        if op == 1: return cmath.exp(z)
        if op == 2: return cmath.log(z)
        if op == 3: return cmath.sin(z)
        if op == 4: return cmath.cos(z)
        if op == 5: return cmath.sin(z) / cmath.cos(z)
        if op == 6: return complex(z.real, -z.imag)
        if op == 7: return (cmath.exp(z) - cmath.exp(-z)) / 2
        if op == 8: return (cmath.exp(z) + cmath.exp(-z)) / 2
    except (ValueError, ZeroDivisionError, OverflowError): pass
    return complex(float('nan'), float('nan'))
`,
    graph: `def iqm_bounds(xmin, xmax, ymin, ymax):
    return all(iqm_finite(v) for v in (xmin, xmax, ymin, ymax, xmax-xmin, ymax-ymin)) and xmax > xmin and ymax > ymin

def iqm_axes(xmin, xmax, ymin, ymax):
    if not iqm_bounds(xmin, xmax, ymin, ymax): return
    brain.screen.set_origin(0, 0)
    brain.screen.set_clip_region(0, 0, 160, 108)
    if xmin <= 0 <= xmax:
        px = int((-xmin / (xmax - xmin)) * 159)
        brain.screen.draw_line(px, 0, px, 107)
    if ymin <= 0 <= ymax:
        py = int((ymax / (ymax - ymin)) * 107)
        brain.screen.draw_line(0, py, 159, py)

def iqm_graph(f, xmin, xmax, ymin, ymax):
    if not iqm_bounds(xmin, xmax, ymin, ymax): return
    brain.screen.set_origin(0, 0)
    brain.screen.set_clip_region(0, 0, 160, 108)
    last = None
    for px in range(160):
        y = iqm_eval(f, xmin + (xmax - xmin) * (px / 159))
        if not iqm_finite(y) or y < ymin or y > ymax:
            last = None
            continue
        py = int(((ymax - y) / (ymax - ymin)) * 107)
        if last is not None and abs(py - last[1]) < 54: brain.screen.draw_line(last[0], last[1], px, py)
        else: brain.screen.draw_pixel(px, py)
        last = (px, py)
    brain.screen.render()
`,
  };
  const cppRuntime = {
    real: `bool iqm_finite(double x) { return isfinite(x); }
double iqm_real_raw(int op, double x) {
    switch(op) {
    case 0: return sqrt(x); case 1: return fabs(x); case 2: return log(x); case 3: return log10(x); case 4: return exp(x);
    case 5: return sin(x); case 6: return cos(x); case 7: return tan(x); case 8: return 1.0/tan(x); case 9: return 1.0/cos(x); case 10: return 1.0/sin(x);
    case 11: return asin(x); case 12: return acos(x); case 13: return atan(x); case 14: return atan2(1.0,x); case 15: return acos(1.0/x); case 16: return asin(1.0/x);
    case 17: return sinh(x); case 18: return cosh(x); case 19: return tanh(x); case 20: return 1.0/tanh(x); case 21: return 1.0/cosh(x); case 22: return 1.0/sinh(x);
    case 23: return asinh(x); case 24: return acosh(x); case 25: return atanh(x); case 26: return atanh(1.0/x); case 27: return acosh(1.0/x); case 28: return asinh(1.0/x);
    } return NAN;
}
double iqm_real(int op, double x) {
    double v=iqm_real_raw(op,x);
    return iqm_finite(x)&&!iqm_finite(v) ? NAN : v;
}
double iqm_power(double x, double y) {
    double v=pow(x,y); return iqm_finite(x)&&iqm_finite(y)&&!iqm_finite(v) ? NAN : v;
}
double iqm_root(double x, double n) {
    if (!iqm_finite(n) || n == 0) return NAN;
    if (x < 0 && n == trunc(n) && fmod(fabs(n),2) == 1) return -iqm_power(-x,1.0/n);
    return iqm_power(x,1.0/n);
}
double iqm_round(double x, double digits, int mode) {
    if (!iqm_finite(x) || !iqm_finite(digits)) return NAN;
    double scale = pow(10,fmax(-12,fmin(12,trunc(digits)))), v=x*scale;
    if (!iqm_finite(v)) return NAN;
    if (mode==0) v = v>=0 ? floor(v+0.5) : ceil(v-0.5);
    else if (mode==1) v=floor(v); else if (mode==2) v=ceil(v); else v=trunc(v);
    return v/scale;
}
`,
    calculus: `template <typename F> double iqm_eval(F f, double x) { return f(x); }
template <typename F> double iqm_derivative(F f, double x, double h, int order) {
    if (!iqm_finite(x) || !iqm_finite(h) || h<=0 || x+h==x || x-h==x) return NAN;
    double a=f(x-h),b=f(x+h);
    return order==1 ? (b-a)/(2*h) : (b-2*f(x)+a)/(h*h);
}
template <typename F> double iqm_integral(F f, double a, double b, double steps) {
    if (!iqm_finite(a)||!iqm_finite(b)||!iqm_finite(b-a)||!iqm_finite(steps)||steps<2||steps>1024) return NAN;
    int n=(int)steps; if(n%2) ++n;
    if(a==b) return 0;
    double h=(b-a)/n,total=f(a)+f(b);
    for(int k=1;k<n;++k) total+=(k%2?4:2)*f(a+k*h);
    return total*h/3;
}
template <typename F> double iqm_series(F f, double a, double b, bool product) {
    if(!iqm_finite(a)||!iqm_finite(b)||a!=trunc(a)||b!=trunc(b)||b-a+1>4096||fabs(a)>9007199254740991.0||fabs(b)>9007199254740991.0) return NAN;
    double total=product?1:0;
    for(double k=a;k<=b;++k) { double v=f(k); total=product?total*v:total+v; }
    return total;
}
`,
    complex: `#include <complex>
typedef std::complex<double> IQComplex;
IQComplex iqm_complex_op(int op, IQComplex a, IQComplex b) {
    switch(op) {
    case 0: return a+b; case 1: return a-b; case 2: return a*b;
    case 3: return b==IQComplex(0,0)?IQComplex(NAN,NAN):a/b;
    case 4: if(b==IQComplex(0,0)) return IQComplex(1,0); return std::pow(a,b);
    } return IQComplex(NAN,NAN);
}
IQComplex iqm_complex_fn(int op, IQComplex z) {
    switch(op) {
    case 0: return std::sqrt(z); case 1: return std::exp(z); case 2: return z==IQComplex(0,0)?IQComplex(NAN,NAN):std::log(z);
    case 3: return std::sin(z); case 4: return std::cos(z); case 5: return std::tan(z); case 6: return std::conj(z); case 7: return std::sinh(z); case 8: return std::cosh(z);
    } return IQComplex(NAN,NAN);
}
void iqm_print_complex(IQComplex z) { Brain.Screen.print("%g%+gi",z.real(),z.imag()); }
`,
    graph: `bool iqm_bounds(double xmin,double xmax,double ymin,double ymax) {
    return iqm_finite(xmin)&&iqm_finite(xmax)&&iqm_finite(ymin)&&iqm_finite(ymax)&&iqm_finite(xmax-xmin)&&iqm_finite(ymax-ymin)&&xmax>xmin&&ymax>ymin;
}
void iqm_axes(double xmin,double xmax,double ymin,double ymax) {
    if(!iqm_bounds(xmin,xmax,ymin,ymax)) return;
    Brain.Screen.setOrigin(0,0); Brain.Screen.setClipRegion(0,0,160,108);
    if(xmin<=0 && xmax>=0) { int px=(int)((-xmin/(xmax-xmin))*159); Brain.Screen.drawLine(px,0,px,107); }
    if(ymin<=0 && ymax>=0) { int py=(int)((ymax/(ymax-ymin))*107); Brain.Screen.drawLine(0,py,159,py); }
}
template <typename F> void iqm_graph(F f,double xmin,double xmax,double ymin,double ymax) {
    if(!iqm_bounds(xmin,xmax,ymin,ymax)) return;
    Brain.Screen.setOrigin(0,0); Brain.Screen.setClipRegion(0,0,160,108);
    bool last=false; int lx=0,ly=0;
    for(int px=0;px<160;++px) {
        double y=f(xmin+(xmax-xmin)*(px/159.0));
        if(!iqm_finite(y)||y<ymin||y>ymax) { last=false; continue; }
        int py=(int)(((ymax-y)/(ymax-ymin))*107);
        if(last && abs(py-ly)<54) Brain.Screen.drawLine(lx,ly,px,py); else Brain.Screen.drawPixel(px,py);
        lx=px;ly=py;last=true;
    } Brain.Screen.render();
}
`,
  };

  pyRuntime.drawing = `def iqm_channel(v):
    return int(max(0, min(255, v))) if iqm_finite(v) else 0

def iqm_arc(x, y, rx, ry, start, end):
    if not all(iqm_finite(v) and abs(v) <= 32000 for v in (x,y,rx,ry,start,end)) or rx < 0 or ry < 0: return
    span = max(-360, min(360, end - start))
    last = None
    for k in range(73):
        t = (start + span * k / 72) * 0.017453292519943295
        point = (int(x + rx * math.cos(t)), int(y + ry * math.sin(t)))
        if last is not None: brain.screen.draw_line(last[0], last[1], point[0], point[1])
        last = point

def iqm_triangle(x1,y1,x2,y2,x3,y3):
    if not all(iqm_finite(v) and abs(v) <= 32000 for v in (x1,y1,x2,y2,x3,y3)): return
    brain.screen.draw_line(int(x1),int(y1),int(x2),int(y2))
    brain.screen.draw_line(int(x2),int(y2),int(x3),int(y3))
    brain.screen.draw_line(int(x3),int(y3),int(x1),int(y1))
`;
  cppRuntime.drawing = `int iqm_channel(double v) { return iqm_finite(v) ? (int)fmax(0,fmin(255,v)) : 0; }
void iqm_arc(double x,double y,double rx,double ry,double start,double end) {
    double values[]={x,y,rx,ry,start,end};
    for(double v:values) if(!iqm_finite(v)||fabs(v)>32000) return;
    if(rx<0||ry<0) return;
    double span=fmax(-360,fmin(360,end-start)); int lx=0,ly=0;
    for(int k=0;k<=72;++k) {
        double t=(start+span*k/72)*0.017453292519943295;
        int px=(int)(x+rx*cos(t)),py=(int)(y+ry*sin(t));
        if(k) Brain.Screen.drawLine(lx,ly,px,py); lx=px;ly=py;
    }
}
void iqm_triangle(double x1,double y1,double x2,double y2,double x3,double y3) {
    double values[]={x1,y1,x2,y2,x3,y3};
    for(double v:values) if(!iqm_finite(v)||fabs(v)>32000) return;
    Brain.Screen.drawLine((int)x1,(int)y1,(int)x2,(int)y2);
    Brain.Screen.drawLine((int)x2,(int)y2,(int)x3,(int)y3);
    Brain.Screen.drawLine((int)x3,(int)y3,(int)x1,(int)y1);
}
`;

  const specs = [];
  const num = (name, value=0) => ({type:'input_value',name,check:'Number',value});
  const znum = (name) => ({type:'input_value',name,check:'IQComplex'});
  const drop = (name, options) => ({type:'field_dropdown',name,options:options.map((v,i)=>Array.isArray(v)?v:[v,String(i)])});
  const names = (list) => list.map(v=>[v,v]);
  const add = (cat,id,label,args,output,emit,tip='') => {
    specs.push({cat,id:'iqm_'+id,label,args,output,emit,tip});
  };
  function need(g, lang, group) {
    if(lang==='py') { g.definitions_.import_math='import math'; }
    if(['calculus','graph','drawing'].includes(group)) need(g,lang,'real');
    if(group==='graph') need(g,lang,'calculus');
    if(group==='complex' && lang==='py') g.definitions_.import_cmath='import cmath';
    if(group==='graph' || group==='drawing' || group==='complex') {
      if(lang==='py') { g.definitions_.import_vex='from vex import *'; g.definitions_.brain='brain = Brain()'; }
    }
    if((lang==='py'?pyRuntime:cppRuntime)[group]) g.definitions_['iqm_'+group]=(lang==='py'?pyRuntime:cppRuntime)[group];
  }
  const val = (b,g,n,d='0') => g.valueToCode(b,n,g.ORDER_NONE)||d;
  const expr = (py,cpp) => lang=>lang==='py'?py:cpp;
  const callable = (lang,body) => lang==='py'?`(lambda iqm_x: ${body})`:`[&](double iqm_x) -> double { return ${body}; }`;
  const fnBlock=(cat,id,ops)=>add(cat,id,'%1 ( %2 )',[drop('OP',names(ops)),num('X',0.5)],'Number',(l,b,g)=>{need(g,l,'real');return `iqm_real(${realOps.indexOf(b.getFieldValue('OP'))}, ${val(b,g,'X')})`;},'Real-valued functions. Trig inputs and inverse outputs are radians; acot returns (0, π). Outside a real domain the result is NaN.');
  fnBlock('Arithmetic','unary',['sqrt','abs','ln','log10','exp']);
  fnBlock('Trigonometry','trig',realOps.slice(5,17));
  fnBlock('Hyperbolic','hyper',realOps.slice(17));
  add('Arithmetic','power','%1 ^ %2',[num('A',2),num('B',3)],'Number',(l,b,g)=>{need(g,l,'real');return `iqm_power(${val(b,g,'A')}, ${val(b,g,'B')})`;});
  add('Arithmetic','root','root degree %1 of %2',[num('N',3),num('X',8)],'Number',(l,b,g)=>{need(g,l,'real');return `iqm_root(${val(b,g,'X')}, ${val(b,g,'N','2')})`;},'Real nth root. Negative inputs support odd integer roots; zero degree or a non-real result produces NaN.');
  add('Arithmetic','round','%1 %2 to %3 decimal places',[drop('MODE',['round','floor','ceil','truncate']),num('X',3.14159),num('DIGITS',2)],'Number',(l,b,g)=>{need(g,l,'real');return `iqm_round(${val(b,g,'X')}, ${val(b,g,'DIGITS')}, ${b.getFieldValue('MODE')})`;},'Round uses half away from zero. Decimal places are limited to −12 through 12.');
  add('Trigonometry','angle','%1 %2',[drop('MODE',['degrees → radians','radians → degrees']),num('X',180)],'Number',(l,b,g)=>`((${val(b,g,'X')}) * ${b.getFieldValue('MODE')==='0'?'0.017453292519943295':'57.29577951308232'})`);
  add('Trigonometry','atan2','atan2 y %1 x %2',[num('Y',1),num('X',1)],'Number',(l,b,g)=>{need(g,l,'real');return `${l==='py'?'math.':''}atan2(${val(b,g,'Y')},${val(b,g,'X')})`;});

  const constants=[['π','3.141592653589793'],['τ = 2π','6.283185307179586'],['e','2.718281828459045'],['φ golden ratio','1.618033988749895'],['1/φ','0.6180339887498949'],['√2','1.4142135623730951'],['√3','1.7320508075688772'],['√5','2.23606797749979'],['ln 2','0.6931471805599453'],['ln 10','2.302585092994046'],['log₂ e','1.4426950408889634'],['log₁₀ e','0.4342944819032518'],['Euler–Mascheroni γ','0.5772156649015329'],['Catalan G','0.915965594177219'],['Apéry ζ(3)','1.2020569031595943'],['Feigenbaum δ','4.66920160910299'],['Feigenbaum |α|','2.502907875095893'],['Khinchin K','2.6854520010653064'],['Glaisher A','1.2824271291006226'],['plastic constant','1.324717957244746'],['silver ratio','2.414213562373095'],['omega Ω','0.5671432904097838'],['∞','inf'],['−∞','-inf'],['NaN','nan']];
  add('Constants','constant','constant %1',[drop('VALUE',constants)],'Number',(l,b)=>{const v=b.getFieldValue('VALUE');return ['inf','-inf','nan'].includes(v)?(l==='py'?`float('${v}')`:({inf:'INFINITY','-inf':'(-INFINITY)',nan:'NAN'}[v])):v;},'Floating-point approximations. Infinity is a numeric sentinel, not an infinite iteration count.');

  add('Calculus & series','x','x (bound variable)',[],'Number',(l,b)=>{
    let child=b, p=b.getParent();
    while(p) { if(['iqm_integral','iqm_derivative','iqm_series','iqm_graph'].includes(p.type) && p.getInputTargetBlock('F')===child) { b.setWarningText(null);return 'iqm_x'; } child=p;p=p.getParent(); }
    b.setWarningText('Use this x inside the function input of an integral, derivative, sum, product, or graph.');
    return l==='py'?"float('nan')":'NAN';
  },'The local x inside a calculus, series or graph function. Outside that function it produces NaN.');
  add('Calculus & series','integral','∫ f(x) %1 dx from %2 to %3 steps %4',[num('F'),num('A',0),num('B',1),num('N',128)],'Number',(l,b,g)=>{need(g,l,'calculus');return `iqm_integral(${callable(l,val(b,g,'F'))},${val(b,g,'A')},${val(b,g,'B','1')},${val(b,g,'N','128')})`;},'Numerical definite integral using composite Simpson’s rule, 2–1024 steps (odd counts round up). Finite endpoints only. This is not symbolic integration.');
  add('Calculus & series','derivative','%1 of f(x) %2 at x %3 step h %4',[drop('ORDER',[['d/dx','1'],['d²/dx²','2']]),num('F'),num('X',1),num('H',0.01)],'Number',(l,b,g)=>{need(g,l,'calculus');return `iqm_derivative(${callable(l,val(b,g,'F'))},${val(b,g,'X')},${val(b,g,'H','0.01')},${b.getFieldValue('ORDER')})`;},'Numerical central difference, first or second derivative. A smaller h is not always more accurate, especially on the brain. h must be positive.');
  add('Calculus & series','series','%1 f(x) %2 for integer x from %3 to %4',[drop('MODE',[['∑ sum','0'],['Π product','1']]),num('F'),num('A',1),num('B',10)],'Number',(l,b,g)=>{need(g,l,'calculus');return `iqm_series(${callable(l,val(b,g,'F'))},${val(b,g,'A','1')},${val(b,g,'B','10')},${b.getFieldValue('MODE')})`;},'Inclusive integer bounds; at most 4096 terms. Empty sum = 0, empty product = 1. Invalid bounds return NaN.');

  add('Comparisons','compare','%1 %2 %3',[num('A'),drop('OP',[['<','<'],['≤','<='],['>','>'],['≥','>='],['=','=='],['≠','!=']]),num('B',1)],'Boolean',(l,b,g)=>`((${val(b,g,'A')}) ${b.getFieldValue('OP')} (${val(b,g,'B')}))`);
  add('Comparisons','between','%1 %2 x %3 %4 %5',[num('A'),drop('LEFT',[['<','<'],['≤','<=']]),num('X',0.5),drop('RIGHT',[['<','<'],['≤','<=']]),num('B',1)],'Boolean',(l,b,g)=>`((${val(b,g,'A')}) ${b.getFieldValue('LEFT')} (${val(b,g,'X')}) ${l==='py'?'and':'&&'} (${val(b,g,'X')}) ${b.getFieldValue('RIGHT')} (${val(b,g,'B')}))`);
  add('Comparisons','near','%1 ≈ %2 within tolerance %3',[num('A',1),num('B',1),num('T',0.001)],'Boolean',(l,b,g)=>`(${l==='py'?'abs':'fabs'}((${val(b,g,'A')})-(${val(b,g,'B')})) <= (${val(b,g,'T')}))`);
  add('Comparisons','finite','%1 is %2',[num('X'),drop('MODE',['finite','infinite','NaN','integer'])],'Boolean',(l,b,g)=>{need(g,l,'real');const x=val(b,g,'X'),m=b.getFieldValue('MODE');if(m==='0')return `iqm_finite(${x})`;if(m==='1')return l==='py'?`(abs(${x}) == float('inf'))`:`isinf(${x})`;if(m==='2')return `((${x}) != (${x}))`;return l==='py'?`(iqm_finite(${x}) and (${x}) == int(${x}))`:`(iqm_finite(${x}) && (${x}) == trunc(${x}))`;});

  add('Complex numbers','complex','complex %1 + %2 i',[num('RE'),num('IM',1)],'IQComplex',(l,b,g)=>{need(g,l,'complex');return `${l==='py'?'complex':'IQComplex'}(${val(b,g,'RE')},${val(b,g,'IM')})`;});
  add('Complex numbers','i','i = √(−1)',[],'IQComplex',(l,b,g)=>{need(g,l,'complex');return l==='py'?'complex(0,1)':'IQComplex(0,1)';});
  add('Complex numbers','complex_op','%1 %2 %3',[znum('A'),drop('OP',['+','−','×','÷','^']),znum('B')],'IQComplex',(l,b,g)=>{need(g,l,'complex');const z=l==='py'?'complex(0,0)':'IQComplex(0,0)';return `iqm_complex_op(${b.getFieldValue('OP')},${val(b,g,'A',z)},${val(b,g,'B',z)})`;});
  add('Complex numbers','complex_fn','complex %1 ( %2 )',[drop('OP',['sqrt','exp','ln','sin','cos','tan','conjugate','sinh','cosh']),znum('Z')],'IQComplex',(l,b,g)=>{need(g,l,'complex');return `iqm_complex_fn(${b.getFieldValue('OP')},${val(b,g,'Z',l==='py'?'complex(0,0)':'IQComplex(0,0)')})`;});
  add('Complex numbers','component','%1 ( %2 )',[drop('PART',['Re','Im','magnitude','argument (radians)']),znum('Z')],'Number',(l,b,g)=>{need(g,l,'complex');const z=val(b,g,'Z',l==='py'?'complex(0,0)':'IQComplex(0,0)'),p=b.getFieldValue('PART');return l==='py'?[`(${z}).real`,`(${z}).imag`,`abs(${z})`,`cmath.phase(${z})`][p]:[`(${z}).real()`,`(${z}).imag()`,`std::abs(${z})`,`std::arg(${z})`][p];});
  add('Complex numbers','print_complex','brain screen print complex %1',[znum('Z')],null,(l,b,g)=>{need(g,l,'complex');const z=val(b,g,'Z',l==='py'?'complex(0,0)':'IQComplex(0,0)');return l==='py'?`brain.screen.print(str(${z}))\n`:`iqm_print_complex(${z});\n`;});
  const complexName=(l,b,g)=>{
    need(g,l,'complex');
    const name='iqmz_'+String(b.getFieldValue('NAME')||'z').replace(/[^A-Za-z0-9_]/g,'_');
    // A mutable holder also works inside Python event callbacks without global declarations.
    g.definitions_[name]=l==='py'?`${name} = [complex(0,0)]`:`IQComplex ${name}(0,0);`;
    return l==='py'?`${name}[0]`:name;
  };
  const nameField=()=>({type:'field_input',name:'NAME',text:'z'});
  add('Complex numbers','complex_get','complex variable %1',[nameField()],'IQComplex',(l,b,g)=>complexName(l,b,g),'A dedicated complex variable. Use the same name in the set complex variable block. Starts at 0 + 0i.');
  add('Complex numbers','complex_set','set complex variable %1 to %2',[nameField(),znum('Z')],null,(l,b,g)=>{
    const name=complexName(l,b,g),z=val(b,g,'Z',l==='py'?'complex(0,0)':'IQComplex(0,0)');
    return `${name} = ${z}${l==='py'?'\n':';\n'}`;
  },'Stores a complex value. Names use letters, digits and underscores; these variables are separate from ordinary numeric variables.');

  const rangeArgs=()=>[num('XMIN',-10),num('XMAX',10),num('YMIN',-5),num('YMAX',5)];
  const rangeCode=(b,g)=>['XMIN','XMAX','YMIN','YMAX'].map(n=>val(b,g,n)).join(',');
  add('Graphing','axes','draw graph axes x %1 to %2 y %3 to %4',rangeArgs(),null,(l,b,g)=>{need(g,l,'graph');return `iqm_axes(${rangeCode(b,g)})${l==='py'?'\n':';\n'}`;},'160 × 108 pixels. Resets drawing origin and clipping to the full screen. Uses the current pen.');
  add('Graphing','graph','graph y = %1 for x %2 to %3 y %4 to %5',[num('F'),...rangeArgs()],null,(l,b,g)=>{need(g,l,'graph');return `iqm_graph(${callable(l,val(b,g,'F'))},${rangeCode(b,g)})${l==='py'?'\n':';\n'}`;},'Plot a real function using 160 samples and the bound x block. Invalid/off-screen points break the line; sharp jumps are not joined. Finite increasing ranges only. Use clear screen and axes first if desired.');

  const screen=(l,g)=>{need(g,l,'drawing');return l==='py'?'brain.screen':'Brain.Screen';};
  const draw=(id,label,args,pym,cppm)=>add('Drawing',id,label,args,null,(l,b,g)=>`${screen(l,g)}.${l==='py'?pym:cppm}(${args.map(a=>`int(${val(b,g,a.name)})`).join(',')})${l==='py'?'\n':';\n'}`);
  draw('origin','set drawing origin x %1 y %2',[num('X'),num('Y')],'set_origin','setOrigin');
  draw('clip','set drawing clip x %1 y %2 width %3 height %4',[num('X'),num('Y'),num('W',160),num('H',108)],'set_clip_region','setClipRegion');
  add('Drawing','text','draw text %1 at x %2 y %3',[{type:'input_value',name:'TEXT',check:'String',text:'Hello'},num('X',10),num('Y',20)],null,(l,b,g)=>{const s=screen(l,g),t=val(b,g,'TEXT','""'),x=val(b,g,'X'),y=val(b,g,'Y');return l==='py'?`${s}.print_at(${t}, x=int(${x}), y=int(${y}))\n`:`${s}.printAt(int(${x}), int(${y}), false, "%s", ${t});\n`;});
  add('Drawing','render','render brain screen',[],null,(l,b,g)=>`${screen(l,g)}.render()${l==='py'?'\n':';\n'}`);
  add('Drawing','rgb','set %1 colour RGB %2 %3 %4',[drop('TARGET',[['pen','pen'],['fill','fill']]),num('R',80),num('G',180),num('B',255)],null,(l,b,g)=>{
    const s=screen(l,g),rgb=['R','G','B'].map(n=>`iqm_channel(${val(b,g,n)})`).join(','),target=b.getFieldValue('TARGET');
    return l==='py'?`${s}.set_${target}_color(Color(${rgb}))\n`:`${s}.${target==='pen'?'setPenColor':'setFillColor'}(vex::color(${rgb}));\n`;
  },'Custom RGB colour. Channels are clamped to 0–255.');
  add('Drawing','ellipse','draw ellipse centre x %1 y %2 radius x %3 y %4',[num('X',80),num('Y',54),num('RX',35),num('RY',20)],null,(l,b,g)=>{need(g,l,'drawing');return `iqm_arc(${['X','Y','RX','RY'].map(n=>val(b,g,n)).join(',')},0,360)${l==='py'?'\n':';\n'}`;},'Outline ellipse, approximated by 72 line segments with the current pen.');
  add('Drawing','arc','draw arc centre x %1 y %2 radius %3 from %4 to %5 degrees',[num('X',80),num('Y',54),num('R',30),num('START'),num('END',180)],null,(l,b,g)=>{need(g,l,'drawing');return `iqm_arc(${val(b,g,'X')},${val(b,g,'Y')},${val(b,g,'R')},${val(b,g,'R')},${val(b,g,'START')},${val(b,g,'END')})${l==='py'?'\n':';\n'}`;},'Outline arc. Positive angles are clockwise on the screen; 0 points right. Span limited to one turn.');
  add('Drawing','triangle','draw triangle x %1 y %2 x %3 y %4 x %5 y %6',[num('X1',80),num('Y1',10),num('X2',20),num('Y2',90),num('X3',140),num('Y3',90)],null,(l,b,g)=>{need(g,l,'drawing');return `iqm_triangle(${['X1','Y1','X2','Y2','X3','Y3'].map(n=>val(b,g,n)).join(',')})${l==='py'?'\n':';\n'}`;},'Outline triangle using the current pen.');

  for(const s of specs) {
    const args=s.args.map(({value,text,...a})=>a.type==='field_input'?{...a,text}:a);
    const json={type:s.id,message0:s.label,args0:args,colour:s.cat==='Drawing'?270:230,tooltip:s.tip,inputsInline:s.args.length<4};
    if(s.output) json.output=s.output;else {json.previousStatement=null;json.nextStatement=null;}
    Blockly.defineBlocksWithJsonArray([json]);
    for(const [lang,g] of [['py',PY],['cpp',CPP]]) g.forBlock[s.id]=(b,gen)=>{const code=s.emit(lang,b,gen);return s.output?[code,gen.ORDER_ATOMIC]:code;};
  }
  const tool=s=>({kind:'block',type:s.id,inputs:Object.fromEntries(s.args.filter(a=>a.type==='input_value' && a.check!=='IQComplex').map(a=>[a.name,{shadow:a.check==='String'?{type:'text',fields:{TEXT:a.text||''}}:{type:'math_number',fields:{NUM:a.value||0}}}]))});
  const toolboxBlock = (s) => {
    const item = tool(s);
    if (['iqm_integral','iqm_derivative','iqm_series'].includes(s.id)) {
      item.inputs.F = {block:{type:'iqm_power',inputs:{
        A:{block:{type:'iqm_x'}},
        B:{shadow:{type:'math_number',fields:{NUM:2}}},
      }}};
    }
    if (s.id === 'iqm_graph') item.inputs.F = {block:{type:'iqm_trig',fields:{OP:'sin'},inputs:{X:{block:{type:'iqm_x'}}}}};
    return item;
  };
  const categories=Blockly.IQ_TOOLBOX.contents;
  const math=categories.find(c=>c.name==='Math');
  const category=(name,contents)=>({kind:'category',name,colour:'230',contents});
  math.contents=[category('Basic',math.contents),...['Arithmetic','Trigonometry','Hyperbolic','Constants','Comparisons','Calculus & series','Complex numbers','Graphing'].map(name=>category(name,specs.filter(s=>s.cat===name).map(toolboxBlock)))];
  const looks=categories.find(c=>c.name==='Looks');
  const drawingTypes=['iq_l_pixel','iq_l_line','iq_l_rect','iq_l_circle','iq_l_fill','iq_l_pen','iq_l_pen_width','iq_l_font'];
  const drawing={kind:'category',name:'Brain drawing',colour:'270',contents:[{kind:'block',type:'iq_clear'},...looks.contents.filter(b=>drawingTypes.includes(b.type)),...specs.filter(s=>s.cat==='Drawing').map(toolboxBlock)]};
  categories.splice(categories.indexOf(looks)+1,0,drawing);
  PY.addReservedWords('iqm_x,iqm_real,iqm_finite,iqm_root,iqm_power,iqm_round,iqm_integral,iqm_series,iqm_derivative,iqm_eval,iqm_complex_op,iqm_complex_fn,iqm_graph,iqm_axes,math,cmath');
  Blockly.IQ_MATH={specs,pyRuntime,cppRuntime,realOps,constants};
})();
