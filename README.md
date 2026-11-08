# iq-raw

Blocks plus raw Python for the VEX IQ (2nd gen) brain. Drag blocks (the Python appears on the right), or tick "Edit code by hand" and write Python directly. Downloads go over USB through VEX's own `vexcom`.

    npm install
    npm start        # then open http://localhost:5174

Needs the VEX extension in VS Code (it ships `vexcom`; on first start it is copied to `~/.iq-raw/vexcom`), or set `VEXCOM=/path/to/vexcom`. For C++ it also needs the IQ2 C++ SDK the extension downloads when you create an IQ (2nd gen) C++ project once (set `VEX_STORAGE` if it lives elsewhere).

- **Language** switch: Python, or C++. In C++ the same blocks compile to C++ (VEX's own clang, SDK and makefile from the VS Code extension), **Build only** shows compiler errors, and Download sends the built `.bin` with `vexcom`. C++ is the way to reach pins: the **Pins (C++)** blocks call the SDK's `vexGenericDigitalEnable/Output/Input`, `vexDigitalPinGet` and `vexAnalogPinGet`. The SDK headers do not say what the `options` and pin numbers mean, so expect to experiment.
- First time on a brain (Python only): press **Install Python VM**.
- **Download and run** sends the code to the chosen slot and starts it.
- Blocks: Brain, Motors, Ports (per-port writes and reads), Controller, Loops, Logic, Math, Text, Variables, Raw Python (raw statement, raw value, raw if, raw while, bitwise).
- The server listens on 127.0.0.1 only and checks Host and Origin, since it can overwrite programs on the brain.

`npm test` checks the block generators and server guards without a brain.
