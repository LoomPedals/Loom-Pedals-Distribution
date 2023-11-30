const { Loom } = require('./tc2.js');
const { Pedals } = require('./pedals.js');
const { DBPipe } = require('./comm.js');
const { this_TC2 } = require('../config.js');

console.log(this_TC2);

const loom = new Loom(this_TC2);
console.log("loom constructor called");

const defaults = {
  relay_pin: 8,
}

const pedals = new Pedals(defaults);
console.log("pedals constructor called");

const dbcon = new DBPipe(loom, pedals);
console.log("db constructor called");

dbcon.keepAlive();
console.log("keep alive called");

// to quit the program, press CTRL+C

// NOT WORKING vvvvv
// function quit() { dbcon.signOff(); process.exit(); }
// dbcon.on('quit', () => quit());
