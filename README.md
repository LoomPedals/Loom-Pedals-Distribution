# Loom Pedals Distribution
 
# `./software` - Driver software

Code that runs driver software to maintain connections between the TC2, AdaCAD, and the Loom Pedals hardware. Currently, you can only use "virtual" pedals that are on-screen in AdaCAD. Physical pedals still need to get re-connected to the system.

## Public Files
* `comm.js` - AdaCAD connection through Firebase cloud services
* `dbnodes.js` - 
* `main.js` - top-level main module
* `pedals.js` - hardware control
* `relay.js` - Arduino relay control

## Private Config Files (BYO)
* `firebase-config.js` - API key and other Firebase configuration details.
* `protocol.js` - loom-specific codes
* `tc2.js` - loom-specific functions

# Installation and Set Up

To run the communications on your machine, you must have Node.JS and NPM installed.
1. Download this repository.
2. Open a terminal into the location where you saved the repo (the root directory) and run `npm install` then run `npm update`.
3. Connect the Arduino relay box to USB.
4. After all dependencies are installed, run the program using the command `node main.js`.

