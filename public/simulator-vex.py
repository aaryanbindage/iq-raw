"""Browser-only VEX API. No USB, host filesystem, sockets, or robot drivers."""
import sys, types, math, json, asyncio, inspect, ast, time
import iqraw_host as _host

_iq_handlers = {name: {True: [], False: []} for name in ('left', 'right', 'check')}
_iq_tasks = set()
def _iq_send(value):
    _host.send(json.dumps(value, allow_nan=False))
def _iq_draw(op, **data):
    if any(isinstance(v, (int, float)) and not math.isfinite(v) for v in data.values()): return
    _iq_send(dict(type='draw', op=op, **data))
async def _iq_sleep(ms):
    await _host.sleep(max(0, min(3600000, float(ms))))
async def _iq_wait(value, units='seconds'):
    await _iq_sleep(value * (1000 if units == 'seconds' else 1))
_iq_iterations = 0
async def _iq_checkpoint():
    global _iq_iterations
    _iq_iterations += 1
    if _iq_iterations % 128 == 0: await _iq_sleep(0)
def _iq_schedule(callback, args=()):
    value = callback(*args)
    if inspect.isawaitable(value):
        task = asyncio.create_task(value); _iq_tasks.add(task)
        def done(t):
            _iq_tasks.discard(t)
            if not t.cancelled() and t.exception(): _iq_send(dict(type='error', message=str(t.exception())))
        task.add_done_callback(done)
def _iq_button_event(name, down):
    for callback in _iq_handlers.get(name, {}).get(bool(down), []): _iq_schedule(callback)

class _Output:
    encoding = 'utf-8'
    def write(self, text):
        if text: _iq_send(dict(type='console', text=str(text)))
        return len(text)
    def flush(self): pass
    def isatty(self): return True
sys.stdout = _Output(); sys.stderr = _Output()
async def _iq_input(prompt=''):
    if prompt: sys.stdout.write(str(prompt))
    return str(await _host.read()).rstrip('\r\n')

class Color:
    def __init__(self, r=255, g=None, b=None):
        if isinstance(r, str): self.value = r
        elif g is None: self.value = 'rgb(%d,%d,%d)' % ((int(r)>>16)&255, (int(r)>>8)&255, int(r)&255)
        else: self.value = 'rgb(%d,%d,%d)' % tuple(max(0,min(255,int(v))) for v in (r,g,b))
    def __str__(self): return self.value
for _name in ('red','green','blue','yellow','orange','purple','cyan','white','black','transparent','red_violet','violet','blue_violet','blue_green','yellow_green','yellow_orange','red_orange'):
    setattr(Color, _name.upper(), Color('Color.'+_name.upper()))
FontType = types.SimpleNamespace(**{n+str(v): n+str(v) for n, values in [('MONO',(12,15,20,30,40,60)),('PROP',(20,30,40))] for v in values})
class _Screen:
    def __init__(self): self._row=1; self._col=1; self._height=12
    def clear_screen(self, color=Color.BLACK): _iq_draw('clear', colour=str(color))
    def set_cursor(self, row, col): self._row=max(1,int(row)); self._col=max(1,int(col))
    def row(self): return self._row
    def column(self): return self._col
    def next_row(self): self._row+=1; self._col=1
    def clear_row(self, row=1): _iq_draw('clearRow', y=(row-1)*self._height, h=self._height)
    def print(self, *values, sep=' ', end=''):
        text=sep.join(map(str,values))+end
        _iq_draw('text', x=(self._col-1)*self._height*.6, y=self._row*self._height, text=text); self._col+=len(text)
    def print_at(self, text, x=0, y=12): _iq_draw('text', text=str(text), x=x, y=y)
    def set_pen_color(self, value): _iq_draw('pen', colour=str(value))
    def set_fill_color(self, value): _iq_draw('fill', colour=str(value))
    def set_pen_width(self, width): _iq_draw('width', value=width)
    def set_font(self, font):
        self._height=int(''.join(c for c in str(font) if c.isdigit()) or '12')
        _iq_draw('font', height=self._height, proportional=str(font).startswith('PROP'))
    def set_origin(self,x,y): _iq_draw('origin',x=x,y=y)
    def set_clip_region(self,x,y,width,height): _iq_draw('clip',x=x,y=y,w=width,h=height)
    def draw_pixel(self,x,y): _iq_draw('pixel',x=x,y=y)
    def draw_line(self,x,y,x2,y2): _iq_draw('line',x=x,y=y,x2=x2,y2=y2)
    def draw_rectangle(self,x,y,width,height,color=None):
        if color is not None: self.set_fill_color(color)
        _iq_draw('rect',x=x,y=y,w=width,h=height)
    def draw_circle(self,x,y,radius,color=None):
        if color is not None: self.set_fill_color(color)
        _iq_draw('circle',x=x,y=y,r=radius)
    def render(self): pass
class Timer:
    def __init__(self): self.clear()
    def clear(self): self._start=_host.now()
    reset=clear
    def time(self,units='msec'): return (_host.now()-self._start)/(1000 if units=='seconds' else 1)
    @staticmethod
    def system(): return _host.now()
    def event(self,callback,ms):
        async def later():
            await _iq_sleep(ms)
            value=callback()
            if inspect.isawaitable(value): await value
        _iq_schedule(later)
class _Button:
    def __init__(self,name='check'): self.name=name
    def pressing(self): return bool(_host.button(self.name))
    def pressed(self,callback): _iq_handlers[self.name][True].append(callback)
    def released(self,callback): _iq_handlers[self.name][False].append(callback)
class Brain:
    def __init__(self):
        self.screen=_Screen(); self.timer=Timer(); self.button=_Button(); self.button_left=_Button('left'); self.button_right=_Button('right')
        self.battery=types.SimpleNamespace(capacity=lambda:100)
    async def play_note(self,octave,note,duration=500):
        if 0<=int(note)<=6:
            frequency=440*2**((((4 if octave<=3 else 5)*12+[0,2,4,5,7,9,11][int(note)])-69)/12)
            _iq_send(dict(type='tone',frequency=frequency,duration=duration))
            await _iq_sleep(duration); self.sound_off()
    def sound_off(self): _iq_send(dict(type='tone',frequency=0,duration=0))
    def play_sound(self,sound): raise RuntimeError('Built-in sound-effect recordings are not included in preview. Musical notes are supported.')
class Thread:
    def __init__(self,callback,args=()): _iq_schedule(callback,args)
class Event:
    def __init__(self): self.callbacks=[]
    def __call__(self,callback): self.callbacks.append(callback)
    def broadcast(self):
        for callback in self.callbacks: _iq_schedule(callback)
    async def broadcast_and_wait(self):
        for callback in self.callbacks:
            value=callback()
            if inspect.isawaitable(value): await value
class _Device:
    def __init__(self,*args,**kwargs): pass
    def __getattr__(self,name): raise RuntimeError('Physical devices are not modeled in preview: '+name)
vex=types.ModuleType('vex')
for _name in ('Brain','Color','FontType','Timer','Thread','Event'): setattr(vex,_name,globals()[_name])
vex.wait=_iq_wait; vex.sleep=_iq_sleep
vex.clear_console=lambda:_iq_send(dict(type='console-clear'))
vex.set_console_text_color=lambda c:_iq_send(dict(type='console-colour',value=str(c)))
vex.Ports=types.SimpleNamespace(**{'PORT'+str(i):i for i in range(1,13)})
for _name in ('Motor','MotorGroup','Controller','SmartDrive','Drivetrain','Touchled','Bumper','Distance','Optical','Inertial','Gyro','ColorSensor','Pneumatic','Vision','AiVision'):
    setattr(vex,_name,_Device)
for _name in ('SECONDS','MSEC','PERCENT','FORWARD','REVERSE','MM','INCHES','DEGREES','TURNS','RPM','VOLT','BRAKE','COAST','HOLD'):
    setattr(vex,_name,_name.lower())
sys.modules['vex']=vex
time.sleep=_iq_sleep

async def _iq_execute(source):
    tree=ast.parse(source,filename='preview.py')
    definitions={n.name:n for n in ast.walk(tree) if isinstance(n,(ast.FunctionDef,ast.AsyncFunctionDef))}
    suspending={'wait','sleep','input','play_note','broadcast_and_wait'}
    suspending.update(n.name for n in definitions.values() if isinstance(n,ast.AsyncFunctionDef))
    def call_name(n): return n.func.id if isinstance(n.func,ast.Name) else n.func.attr if isinstance(n.func,ast.Attribute) else ''
    changed=True
    while changed:
        changed=False
        for name,node in definitions.items():
            if name not in suspending and any(isinstance(n,(ast.For,ast.While)) or (isinstance(n,ast.Call) and call_name(n) in suspending) for n in ast.walk(node)):
                suspending.add(name); changed=True
    class Cooperative(ast.NodeTransformer):
        def visit_FunctionDef(self,node):
            self.generic_visit(node)
            if node.name in suspending:
                return ast.copy_location(ast.AsyncFunctionDef(name=node.name,args=node.args,body=node.body,decorator_list=node.decorator_list,returns=node.returns,type_comment=node.type_comment,type_params=getattr(node,'type_params',[])),node)
            return node
        def visit_Call(self,node):
            self.generic_visit(node)
            return ast.copy_location(ast.Await(value=node),node) if call_name(node) in suspending else node
        def visit_Await(self,node):
            if isinstance(node.value,ast.Call): self.generic_visit(node.value)
            else: self.generic_visit(node)
            return node
        def visit_For(self,node):
            self.generic_visit(node);node.body.insert(0,ast.Expr(value=ast.Await(value=ast.Call(func=ast.Name(id='_iq_checkpoint',ctx=ast.Load()),args=[],keywords=[]))));return node
        visit_While=visit_For
    tree=ast.fix_missing_locations(Cooperative().visit(tree))
    env={'__name__':'__main__','_iq_checkpoint':_iq_checkpoint,'input':_iq_input}
    code=compile(tree,'preview.py','exec',flags=ast.PyCF_ALLOW_TOP_LEVEL_AWAIT)
    value=eval(code,env)
    if inspect.isawaitable(value): await value
