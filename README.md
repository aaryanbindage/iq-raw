# iq-raw

Drag blocks or write raw code, and send it to a VEX IQ (2nd generation) brain over USB. Unlike VEXcode IQ's block editor, you can write the program yourself in Python or C++, and the C++ route reaches the brain's pin-level calls.

**Status:** built from VEX's own headers, templates and tool help, and checked only by compiling. It has not run on a real brain yet. See [Testing with a real brain](#testing-with-a-real-brain).

## Install

macOS only. Paste this whole block into Terminal. It installs Node, git and VS Code (skipping any you already have), adds VEX's VS Code extension, gets this project, and starts it:

```sh
brew install node git && brew install --cask visual-studio-code \
&& code --install-extension vexrobotics.vexcode \
&& git clone https://github.com/knittingCat/iq-raw.git && cd iq-raw \
&& npm install && npm start
```

Then open http://localhost:5174 in Chrome, Safari or Firefox.

You need [Homebrew](https://brew.sh) for the first line. If you already have Node, git and VS Code, only the last three lines matter.

**One manual step, needed for both languages:** installing the extension is not enough. It downloads its tools (including `vexcom`, which sends programs to the brain) the first time you use it. Open VS Code, press Cmd+Shift+P, type "New Project", pick the VEX one (or use the VEX icon in the sidebar), and make an **IQ (2nd gen) C++** project once. Wait for the downloads to finish. For Python mode this makes `vexcom` appear; for C++ mode it also gets VEX's C++ SDK and compiler. If iq-raw says "vexcom was not found", this step is what is missing.

On Apple Silicon Macs, VEX's `vexcom` is an Intel program, so macOS may ask to install Rosetta the first time.

For C++ builds, wait for the toolchain download and extraction to finish. If it was interrupted, run VEX's **Download Toolchain** command in VS Code again. iq-raw supports both `toolchain_osxarm64` and `toolchain_osx64`, and also checks `~/.iq-raw/toolchains` for a local installation. A ZIP file alone is not an installed toolchain.

Before downloading to a brain, disconnect it in VEXcode IQ or save and quit VEXcode IQ. Another app holding the brain's USB ports open can interfere with transfers even when **Check brain** succeeds.

To run it again later: `cd iq-raw && npm start`. To stop it: Ctrl+C in that Terminal window.

## How to use it

1. **Plug the brain in** with a USB-C cable and turn it on. If macOS shows an **"Allow accessory to connect?"** prompt, click **Allow**. Until you do, the Mac lists the brain but blocks it, and iq-raw (and VS Code's VEX extension) report "Device not specified or not found" or "no device connected". Press **Check brain** (top right). It says "connected" when it finds the brain.
2. **Pick a language** in the top bar: Python or C++.
3. **Pick a slot** (1 to 8) and a name. This is where the program is stored on the brain and the name it shows.
4. **Make the program**, either way:
   - Drag blocks from the left toolbox. The code they make appears on the right and updates live.
   - Or tick **Edit code by hand** and type your own code in the box. Block syncing then stops. Untick it to go back to blocks, which replaces what you typed.
5. **Send it:**
   - **Download and run** sends the program to the slot and starts it.
   - **Download** sends it without starting.
   - **Run slot** starts whatever is already in the slot. **Stop** stops the running program.
6. Messages from the tools appear in the box at the bottom right. Compiler errors and brain messages show up there.

**Python mode, first time on a brain:** press **Install Python VM** once. It puts VEX's Python interpreter on the brain. Redo it after a VEXos update.

**C++ mode:** press **Build only** to compile and see errors without touching the brain. Download compiles first, then sends.

Other buttons: **Open .py** and **Save .py** load and save the code box as a file (`.cpp` in C++ mode). **Programs on brain** lists what is stored. **Probe brain API** (Python) runs a small program that prints which calls the brain's Python offers.

**Make it yours:** open **Settings → Appearance** for System, Light, Dark, Midnight, High Contrast, or the patterned Aurora, Blueprint, Circuit, and Sunset themes. Settings also includes theme previews, app-wide or canvas-only patterns with Off, Subtle, Bold, and Vivid strength, alignment dots, code text size, and saved language, slot, and name. Preferences save automatically in this browser.

### The blocks

**Advanced math:** open **Math** for arithmetic (√, powers, nth roots, rounding and logarithms), all six trigonometric and inverse trigonometric functions, all six hyperbolic and inverse hyperbolic functions, comparisons and inequalities, and 25 constants including π, τ, e, φ, ∞, Euler–Mascheroni, Catalan, Apéry and Feigenbaum constants. Trigonometric functions use radians; angle-conversion blocks are included. `acot` uses the principal range (0, π). Invalid real domains and finite-input overflow produce NaN; use the finite/NaN test block to handle them.

**Calculus and series:** these are numerical approximations, not symbolic algebra. Plug the **x (bound variable)** block into the function input of an integral, derivative, sum, product, or graph. The default function for calculus is x². Definite integrals use composite Simpson’s rule with 2–1024 steps; derivatives use a central difference with a configurable positive step (first or second derivative). Sums (∑) and products (Π) include both integer endpoints and allow at most 4096 terms. Infinite endpoints are unsupported. An empty sum is 0; an empty product is 1. Very small derivative steps can lose accuracy on the brain’s floating-point hardware.

**Complex numbers:** create a + bi or the imaginary unit i, then add, subtract, multiply, divide, raise to a complex power, conjugate, or apply complex √, exp, ln, sin, cos, tan, sinh and cosh. Use Re(), Im(), magnitude, and argument to get real values, or the dedicated complex print block to show a complex result. Complex values have dedicated set/get variable blocks, separate from ordinary numeric variables. Python uses the brain’s documented `cmath` library; C++ uses `std::complex`.

**Graph on the brain:** clear the screen, choose a pen color, draw graph axes, then use **Math → Graphing → graph y = …**. Its default function is sin(x). Set the x and y ranges to fit your function. The graph samples all 160 screen columns; off-screen or undefined values break the line, and large jumps are not joined. This is a sampled plot, so very narrow features and some discontinuities can still be missed. Graphing resets the origin and clipping to the full 160 × 108 screen.

**Brain drawing:** pixels, lines, rectangles, circles, outline ellipses, arcs and triangles, pen/fill colors (including custom RGB), pen width, fonts, positioned text, drawing origin, clipping, clear and render. Screen coordinates start at the top left: x = 0–159, y = 0–107. Positive arc angles run clockwise from the right. Drawing calls follow VEX’s [IQ2 screen API](https://api.vex.com/iq2/home/python/Screen.html); math libraries follow its [MicroPython library list](https://api.vex.com/iq2/home/python/Micropython_libraries.html). Math is numerically tested and the C++ is compiled against VEX’s SDK; these additions have not been tested on a physical brain.

Start a program with **Events → when started**, then attach blocks underneath it. Those blocks run once in order when the program starts. Existing programs without a start block still work; use one start stack to keep execution order clear.

| Category | What it does |
|---|---|
| Events | "When started", plus a stack that runs when a brain button, bumper, touch LED, controller axis or button, or optical gesture or object event happens, or when a named event you broadcast arrives. |
| Brain | Print to the brain screen, clear it, move the cursor, wait. |
| Motors | Spin (with or without a speed, for a distance, or to a position), stop, set velocity, stopping mode, timeout, torque and position, and read position, velocity, current, done and spinning. |
| Ports | Raw volts to a motor, Touch LED colour, bumper and distance reads, and "port N device, call anything". |
| Pins (C++) | Write high or low to one of the 12 ports' prongs, plus pin enable, write, read, digital and analog reads. C++ only. |
| Controller | Joystick axes A to D and the eight buttons. |
| Loops | While, repeat, for, break, wait until, wait with units, and start a thread. |
| Logic, Math, Text, Variables | The usual building blocks. |
| Drivetrain | A setup block (motor ports, wheel size, brain gyro), then drive, drive for a distance, turn, turn for, turn to heading or rotation, velocities, stopping, timeout, and reads for heading, rotation, velocity, current, done and moving. |
| Looks | Draw pixels, lines, rectangles and circles, set pen and fill colour, pen width and font, next row, clear row, console print and clear, colour sensor light, touch LED brightness and fade. |
| Sound | Play a note or one of the built-in sounds. |
| Sensing | Brain (battery, button, cursor, timer), touch LED, colour sensor, distance sensor, gyro, inertial and optical sensor blocks. |
| Functions | Your own functions, with number inputs and an optional number result. |
| Lists (Python) | List blocks. They exist only in Python mode; in C++ mode they leave a comment. |
| Raw Python | A raw statement, a raw value, a raw `if`, a raw `while`, and a bitwise AND, OR, XOR and shift. The text you type is copied as it is, so in C++ mode it must be C++. |

These cover the blocks documented for VEXcode IQ (2nd gen). Left out: the vision sensor and GPS blocks (they need a configured sensor), and the "monitor" blocks (a VEXcode window feature). Use the raw blocks for those.

## How it works

```
 browser page (Blockly blocks + code box)
        │  code, slot, name
        ▼
 local server (server.js, Node, 127.0.0.1 only)
        ├── Python:  main.py ───────────────► vexcom --slot N --write main.py
        └── C++:     main.cpp ─► make + clang ─► iqraw.bin ─► vexcom --slot N --write iqraw.bin
                                                              │ USB
                                                              ▼
                                                        VEX IQ 2nd gen brain
```

- **The page** (`public/index.html`) uses Google's Blockly library to draw the blocks. The files `public/iq-blocks.js` (Python) and `public/iq-cpp.js` (C++) turn each block into code. Both live in the page, so what you see in the code box is exactly what gets sent.
- **The server** (`server.js`) is a small local web server. It never talks to the brain itself. It runs VEX's own tools and passes their output back to the page.
- **`vexcom`** is VEX's download tool. It ships inside VEX's VS Code extension, and on first start the server copies it to `~/.iq-raw/vexcom`. It speaks the brain's USB protocol, packages Python programs the way the brain expects, and writes the program into the slot. This is why iq-raw does not need its own copy of the protocol.
- **C++ builds** use VEX's own SDK, clang compiler and project makefile, taken from the same VS Code extension. The server unzips VEX's empty IQ (2nd gen) C++ project into a temporary folder, drops your `main.cpp` in, runs `make`, and sends the `.bin` it produces. The temporary folder is deleted afterwards.
- **Pins:** the Python on the brain has no pin calls. The C++ SDK does: `vexGenericDigitalEnable`, `vexGenericDigitalOutput`, `vexGenericDigitalInput`, `vexDigitalPinGet`, `vexAnalogPinGet`. The headers do not explain what the pin number and options mean. The one-block "write to prong of port N" uses enable options 0 and pin 0 as a starting guess.
- **Safety:** the server listens on 127.0.0.1 only, checks the Host and Origin of every request, and accepts only JSON, because anything that can reach it can overwrite programs on a brain. Your work is also saved in the browser (localStorage), per language.

### Files

- `server.js` : local server, runs `vexcom` and the C++ build.
- `public/index.html` : the editor page and its buttons.
- `public/iq-blocks.js` : block definitions, the Python generator, the toolbox.
- `public/iq-cpp.js` : the C++ generator.
- `public/iq-catalog.js` : the table of most IQ blocks (label, Python and C++ for each); both generators are built from it.
- `test/blocks.test.mjs`, `test/catalog.test.mjs` : check the generators and the server's guards, compile a pin program, and build every catalog block in both languages (the Python must parse and the C++ must compile with VEX's compiler, with every dropdown option). Run them with `npm test`.

## Testing with a real brain

Nothing here has run on hardware yet. For someone with an IQ (2nd gen) brain:

1. Install as above, plug the brain in, open the page, press **Check brain**.
2. Python: press **Install Python VM**, **Probe brain API**, then **Download and run** the starter program.
3. C++: press **Build only**, then **Download and run**. Try the "write high to prong of port N" block with a multimeter or an LED on that port.
4. Report what the options and pin numbers need to be, and anything that errors, with the text from the log box.

Not checked on a brain: the Python for every block. It follows VEX's block docs and parses, but no Python interpreter ran it. A few Python names are from memory because the docs don't show them: the `ColorSensor` and `Gyro` constructors, and `SmartDrive` with a wheel size. The C++ is checked by compiling against VEX's SDK headers.

## Limits

- macOS only for now. The server looks for VEX's tools in the macOS locations.
- IQ 2nd generation only. The 1st generation brain has no Python and a different protocol.
- Needs VS Code and VEX's extension for `vexcom` and the C++ SDK. They are VEX's software and are not included here.
