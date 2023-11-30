// PedalGPIO and PedalEmulator are interchangeable because they have the same events

const { EventEmitter } = require('stream');
// const { PedalHTTPServer } = require('./1_pedals/virtualPedals/server.js');
const { PCRelay } = require('./relay.js');

class Pedals extends EventEmitter {
	constructor(params) {
		super();
		// this.control = new PedalHTTPServer(params.dir);
		this.control = new EventEmitter();
		this.relay = new PCRelay(8);

		this.control.on('count', (e) =>	{
			console.log("count changed ", e);
			this.emit('count', e);
		});

		this.control.on('states', (e) => {
			console.log("pedal states change ", e);
			this.emit('states', e);
		});

		this.control.on('vacuum', () => 
			this.emit('vacuum'));

		this.relay.on('ready', () => {
			this.emit('relay-ready');
		});
	}

	toggleRelay() {
		this.relay.toggle();
	}

	step() {
		setTimeout(() => this.pedals.toggleRelay(), 300);
		this.pedals.toggleRelay();
	}
}

module.exports = {
	Pedals,
};

// physical mapping should work on any Pi
// GPIO nums will only work on the Pi Zero/certain models
// https://pinout.xyz/pinout/
if (require.main === module) {
	const defaultPins = {
		clk: 23, 		// PI23 / GPIO11 / SCLK
		shift: 24, 		// PI24 / [~W/S] GPIO8 / SPI-CE0
		pedals: 21,		// PI21 / GPIO9 / SPI-MISO
		loomRelay: 22,	// PI22 / GPIO25
		countPins: [29, 31, 33, 35] // PI 29-31-33-35 / GPIO 5-6-13-19
	}
	const ctrl = new Pedals();
}
