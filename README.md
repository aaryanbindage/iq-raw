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

**One manual step for C++ mode:** open VS Code, press Cmd+Shift+P, type "New Project" and pick the VEX one (or use the VEX icon in the sidebar), and make an **IQ (2nd gen) C++** project once. That makes the extension download VEX's C++ SDK and compiler, which iq-raw reuses. Python mode does not need this.

On Apple Silicon Macs, VEX's `vexcom` is an Intel program, so macOS may ask to install Rosetta the first time.

To run it again later: `cd iq-raw && npm start`. To stop it: Ctrl+C in that Terminal window.

## How to use it

1. **Plug the brain in** with a USB-C cable and turn it on. Press **Check brain** (top right). It says "connected" when it finds the brain.
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

### The blocks

| Category | What it does |
|---|---|
| Brain | Print to the brain screen, clear it, move the cursor, wait. |
| Motors | Set a motor up (port, reversed), spin it at a percent, spin it a number of degrees, stop it. |
| Ports | Raw volts to a motor, Touch LED colour, bumper and distance reads, and "port N device, call anything". |
| Pins (C++) | Write high or low to one of the 12 ports' prongs, plus pin enable, write, read, digital and analog reads. C++ only. |
| Controller | Joystick axes A to D and the eight buttons. |
| Loops, Logic, Math, Text, Variables | The usual building blocks. |
| Raw Python | A raw statement, a raw value, a raw `if`, a raw `while`, and a bitwise AND, OR, XOR and shift. The text you type is copied as it is, so in C++ mode it must be C++. |

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
- `test/blocks.test.mjs` : checks the generators and the server's guards, and compiles a pin program with VEX's compiler. Run it with `npm test`.

## Testing with a real brain

Nothing here has run on hardware yet. For someone with an IQ (2nd gen) brain:

1. Install as above, plug the brain in, open the page, press **Check brain**.
2. Python: press **Install Python VM**, **Probe brain API**, then **Download and run** the starter program.
3. C++: press **Build only**, then **Download and run**. Try the "write high to prong of port N" block with a multimeter or an LED on that port.
4. Report what the options and pin numbers need to be, and anything that errors, with the text from the log box.

Unverified from memory: Python `spin(..., VOLT)`, `Touchled.set_color(Color.X)` and `Distance.object_distance(MM)`. The C++ names were checked against the SDK headers.

## Limits

- macOS only for now. The server looks for VEX's tools in the macOS locations.
- IQ 2nd generation only. The 1st generation brain has no Python and a different protocol.
- Needs VS Code and VEX's extension for `vexcom` and the C++ SDK. They are VEX's software and are not included here.
