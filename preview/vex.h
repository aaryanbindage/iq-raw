#pragma once
// Browser-only VEX compatibility layer. This never links the robot SDK.
#include <cstdint>
#include <cstdio>
#include <cstdlib>
#include <cstdarg>
#include <cstring>
#include <cmath>
#include <string>
#include <vector>
#include <algorithm>
extern "C" {
__attribute__((import_module("iqraw"),import_name("emit"))) void iqraw_emit(const char*,int);
__attribute__((import_module("iqraw"),import_name("sleep"))) void iqraw_sleep(double);
__attribute__((import_module("iqraw"),import_name("clock"))) double iqraw_clock();
__attribute__((import_module("iqraw"),import_name("button"))) int iqraw_button(int);
}
namespace iqraw {
inline std::string quote(const char*s){std::string r="\"";for(const unsigned char*p=(const unsigned char*)(s?s:"");*p;p++){switch(*p){case '"':r+="\\\"";break;case '\\':r+="\\\\";break;case '\n':r+="\\n";break;case '\r':r+="\\r";break;case '\t':r+="\\t";break;default:if(*p<32){char b[8];snprintf(b,sizeof(b),"\\u%04x",*p);r+=b;}else r+=(char)*p;}}return r+'"';}
inline void send(std::string s){iqraw_emit(s.data(),(int)s.size());}
inline void draw(const char*op,const std::string&args=""){send("{\"type\":\"draw\",\"op\":"+quote(op)+(args.empty()?"":","+args)+"}");}
inline std::string num(double x){char b[80];if(!std::isfinite(x))return "null";snprintf(b,sizeof(b),"%.15g",x);return b;}
inline std::string xy(double x,double y){return "\"x\":"+num(x)+",\"y\":"+num(y);}
inline void unsupported(const char*s){send("{\"type\":\"error\",\"message\":"+quote(s)+"}");exit(1);}
inline std::string format(const char*fmt,va_list args){char b[4096];vsnprintf(b,sizeof(b),fmt,args);return b;}
}
namespace vex {
enum timeUnits {msec,seconds};
enum percentUnits {percent};
enum rotationUnits {degrees,turns};
enum directionType {fwd,forward=fwd,reverse};
enum velocityUnits {rpm,dps};
enum brakeType {coast,brake,hold};
enum voltageUnits {volt};
enum currentUnits {amp};
enum distanceUnits {mm,inches};
enum turnType {left,right};
enum fontType {mono12=12,mono15=15,mono20=20,mono30=30,mono40=40,mono60=60,prop20=120,prop30=130,prop40=140};
enum soundType {siren,wrongWay,wrongWaySlow,fillup,headlightsOn,headlightsOff,tollBooth,alarm,tada,doorClose,ratchet,wrench,siren2,ratchet2,alarm2,powerDown};
struct color {
  std::string value;
  color():value("Color.WHITE"){}
  color(int r,int g,int b):value("rgb("+std::to_string(std::clamp(r,0,255))+","+std::to_string(std::clamp(g,0,255))+","+std::to_string(std::clamp(b,0,255))+")"){}
  color(uint32_t rgb):color((rgb>>16)&255,(rgb>>8)&255,rgb&255){}
  explicit color(const char*s):value(s){}
  static const color red,green,blue,yellow,orange,purple,cyan,white,black,transparent,red_violet,violet,blue_violet,blue_green,yellow_green,yellow_orange,red_orange;
};
#define IQ_COLOUR(n) inline const color color::n("Color." #n);inline const color n=color::n;
IQ_COLOUR(red) IQ_COLOUR(green) IQ_COLOUR(blue) IQ_COLOUR(yellow) IQ_COLOUR(orange) IQ_COLOUR(purple) IQ_COLOUR(cyan) IQ_COLOUR(white) IQ_COLOUR(black) IQ_COLOUR(transparent) IQ_COLOUR(red_violet) IQ_COLOUR(violet) IQ_COLOUR(blue_violet) IQ_COLOUR(blue_green) IQ_COLOUR(yellow_green) IQ_COLOUR(yellow_orange) IQ_COLOUR(red_orange)
#undef IQ_COLOUR
class timer {
  double start_=iqraw_clock();
 public:
  void clear(){start_=iqraw_clock();}void reset(){clear();}
  double time(timeUnits u=msec){return (iqraw_clock()-start_)/(u==seconds?1000:1);}
  static uint32_t system(){return (uint32_t)iqraw_clock();}
  static double systemHighResolution(){return iqraw_clock()*1000;}
  void event(void(*)(),int){iqraw::unsupported("C++ timer callbacks are not supported in preview. Use timer.time() in a loop.");}
};
inline void wait(double n,timeUnits u){iqraw_sleep(std::max(0.0,n*(u==seconds?1000:1)));}
namespace this_thread {inline void sleep_for(uint32_t n){iqraw_sleep(n);}inline void yield(){iqraw_sleep(0);}}
class button {
  int id_;
 public:explicit button(int id=2):id_(id){}bool pressing(){return iqraw_button(id_);}
  void pressed(void(*)()){iqraw::unsupported("C++ button callbacks are not supported in preview. Use button.pressing() in a loop.");}
  void released(void(*)()){iqraw::unsupported("C++ button callbacks are not supported in preview. Use button.pressing() in a loop.");}
};
class screen {
  int row_=1,col_=1,height_=12;
  void text(double x,double y,const std::string&s){iqraw::draw("text",iqraw::xy(x,y)+",\"text\":"+iqraw::quote(s.c_str()));}
 public:
  void clearScreen(color c=black){iqraw::draw("clear","\"colour\":"+iqraw::quote(c.value.c_str()));}
  void clearLine(int row=1){iqraw::draw("clearRow","\"y\":"+std::to_string((row-1)*height_)+",\"h\":"+std::to_string(height_));}
  void setCursor(int row,int col){row_=std::max(1,row);col_=std::max(1,col);}
  int row(){return row_;}int column(){return col_;}void newLine(){row_++;col_=1;}
  void print(const char*fmt,...){va_list args;va_start(args,fmt);auto s=iqraw::format(fmt,args);va_end(args);text((col_-1)*height_*.6,row_*height_,s);col_+=(int)s.size();}
  void print(const std::string&s){print("%s",s.c_str());}
  void print(double n){print("%g",n);}void print(int n){print("%d",n);}
  void printAt(int x,int y,const char*fmt,...){va_list args;va_start(args,fmt);auto s=iqraw::format(fmt,args);va_end(args);text(x,y,s);}
  void printAt(int x,int y,bool,const char*fmt,...){va_list args;va_start(args,fmt);auto s=iqraw::format(fmt,args);va_end(args);text(x,y,s);}
  void setPenColor(color c){iqraw::draw("pen","\"colour\":"+iqraw::quote(c.value.c_str()));}
  void setFillColor(color c){iqraw::draw("fill","\"colour\":"+iqraw::quote(c.value.c_str()));}
  void setPenWidth(int n){iqraw::draw("width","\"value\":"+std::to_string(n));}
  void setFont(fontType f){height_=(int)f%100;iqraw::draw("font","\"height\":"+std::to_string(height_)+",\"proportional\":"+((int)f>=100?"true":"false"));}
  void setOrigin(int x,int y){iqraw::draw("origin",iqraw::xy(x,y));}
  void setClipRegion(int x,int y,int w,int h){iqraw::draw("clip",iqraw::xy(x,y)+",\"w\":"+std::to_string(w)+",\"h\":"+std::to_string(h));}
  void drawPixel(int x,int y){iqraw::draw("pixel",iqraw::xy(x,y));}
  void drawLine(int x,int y,int x2,int y2){iqraw::draw("line",iqraw::xy(x,y)+",\"x2\":"+std::to_string(x2)+",\"y2\":"+std::to_string(y2));}
  void drawRectangle(int x,int y,int w,int h){iqraw::draw("rect",iqraw::xy(x,y)+",\"w\":"+std::to_string(w)+",\"h\":"+std::to_string(h));}
  void drawRectangle(int x,int y,int w,int h,color c){setFillColor(c);drawRectangle(x,y,w,h);}
  void drawCircle(int x,int y,int r){iqraw::draw("circle",iqraw::xy(x,y)+",\"r\":"+std::to_string(r));}
  void drawCircle(int x,int y,int r,color c){setFillColor(c);drawCircle(x,y,r);}
  void render(){}
};
class brain {
 public:
  screen Screen;timer Timer;button buttonLeft{0},buttonRight{1},buttonCheck{2};button&buttonUp=buttonLeft;button&buttonDown=buttonRight;
  struct battery {double capacity(percentUnits=percent){return 100;}} Battery;
  brain(){setvbuf(stdout,nullptr,_IONBF,0);}
  void soundOff(){iqraw::send("{\"type\":\"tone\",\"frequency\":0,\"duration\":0}");}
  void playNote(int octave,int note){if(note<0||note>6)return;const int steps[]={0,2,4,5,7,9,11};double hz=440*std::pow(2.0,(((octave<=3?4:5)*12+steps[note])-69)/12.0);iqraw::send("{\"type\":\"tone\",\"frequency\":"+iqraw::num(hz)+",\"duration\":500}");}
  void playNote(int octave,int note,int ms){if(ms>0){playNote(octave,note);iqraw_sleep(ms);}soundOff();}
  void playTone(int note,uint32_t,uint32_t duration){if(note==0){soundOff();return;}playNote(note<=7?3:4,(note-1)%7);if(duration!=1)iqraw_sleep(duration);}
  void playSound(soundType){iqraw::unsupported("Built-in sound-effect recordings are not included in preview. Musical notes are supported.");}
  void programStop(){exit(0);}
};
class thread {public:template<class F>thread(F){iqraw::unsupported("C++ threads are not supported in preview. Use a single main loop.");}};
// These types allow common generated helpers to compile; physical device access stops.
struct vision {struct object{bool exists=false;int width=0,height=0,centerX=0,centerY=0,angle=0,originX=0,originY=0;};int objectCount=0;object objects[16];};
struct aivision {enum class objectType{colorObject,codeObject,modelObject,tagObject=8,allObject};struct object{bool exists=false;int width=0,height=0,centerX=0,centerY=0,angle=0,originX=0,originY=0,id=0,score=0;objectType type{};const char*className="";};int objectCount=0;object objects[24];};
}
inline void vexSystemExitRequest(){exit(0);}
