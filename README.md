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

(to do: merge these two lists) [[https://github.com/LoomPedals/Loom-Pedals-Distribution/edit/main/README.md]]
1. Clone repository.
2. Obtain firebase-config.js file and place in /node directory.
3. Open terminal and navigate to /node directory.
4. Run npm install.
If you don't already have AdaCAD installed, also install that.
Run
Switch your AdaCAD repository to the comms branch.
Compile and run AdaCAD with ng serve.
Open AdaCAD in your browser, open the side toolbar (">>" button) and navigate to the Settings tab.
Click "Connect to Loom" and note the loom ID number that generates.
Actually physically connect the loom to your computer with the USB cable.
Open another terminal in the /node directory.
Run node main.js ####, replacing #### with the ID number from Step 4.

