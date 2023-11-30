/**
 * FILE: firebasePi.js
 */

const { initializeApp } = require('firebase/app');
const { getDatabase, ref, get, set, onValue, push } = require("firebase/database");
const { EventEmitter } = require('stream');
const { getFirebaseConfig } = require('./firebase-config.js');
const { DBWriter, DBListener, DBTwoWay, OnlineStatus, DBWriterArray, DBReadBuffer, DBTwoWayArray } = require('./dbnodes.js');

/**
 * Wraps all DBNodes into a single object that represents the
 * loom/pedal/AdaCAD state in the database.
 */
class DBStatus extends EventEmitter {
    pi_online;     // is the pi online?
    loom_online;   // is the loom online?
    vacuum_on;     // is the loom running? (vacuum pump running)
    active_draft;
    num_pedals;
    pedal_states;
    loom_ready;
    num_picks;
    pick_data;

    pedal_array;    // DBWriterArray
    v_pedal_array;  // DBTwoWayArray

    constructor(db) {
        // console.log(db);
        super();
        const defaults = {
            pi_online: true,
            loom_online: false,
            vacuum_on: false,
            num_pedals: 0,
            pedal_states: false,
            loom_ready: false
        }
        const listeners = {
            active_draft: 'active-draft',
            num_picks: 'num-picks',
            // pick_data: 'pick-data'
        }

        const writers = {
            loom_online: 'loom-online',
            vacuum_on: 'vacuum-on',
            num_pedals: 'num-pedals',
            pedal_states: 'pedal-states',
            loom_ready: 'loom-ready'
        }

        function params(path, initVal) { 
            if (initVal !== undefined) { return { db: db, root: 'pedals/', path: path, initVal: initVal }; }
            else return { db: db, root: 'pedals/', path: path };
          };

        // const params = {
        //     db: db,
        //     root: 'pedals/',
        //     path: 'pi-online',
        //     initVal: defaults.pi_online
        // }

        this.pi_online = new OnlineStatus(params('pi-online', defaults.pi_online));
        this.pi_online.attach();
        this.pi_online.setVal(true);
        // this.loom_online = new OnlineStatus(db, 'loom-online', defaults[this.loom_online]);
        // this.loom_online.attach();

        for (var l in listeners) {
            // params.path = listeners[l];
            // params.initVal = defaults[l];
            var newL = new DBListener(params(listeners[l], defaults[l]));
            Object.defineProperty(this, l, { value: newL });
            this[l].attach();
        }
        
        // params.path = 'pick-data';
        // params.initVal = false;
        this.pick_data = new DBReadBuffer(params('pick-data', false));
        this.pick_data.attach();
      
        for (var w in writers) {
            // params.path = writers[w];
            // params.initVal = defaults[w];
            var newW = new DBWriter(params(writers[w], defaults[w]));
            Object.defineProperty(this, w, { value: newW });
            this[w].attach();
            this[w].setVal(defaults[w]);
        }

        this.pedal_array = new DBWriterArray(this.num_pedals, this.pedal_states, {});

        this.num_v_pedals = new DBTwoWay(params('num-v-pedals'));
        this.v_pedal_states = new DBTwoWay(params('v-pedal-states'));
        this.v_pedal_states.attach();
    }
}

/**
 * Makes sure that state of the loom and pedals 
 * are formatted and written correctly to database
 */
class DBPipe extends EventEmitter {
    db;
    dbstatus;
    loom;
    pedals;
    lpstate;

    pick_data; // converted pick data from string to bytes

    constructor(loomHandle, pedalsHandle) {
        super();
        const config = getFirebaseConfig();
        const app = initializeApp(config);
        
        this.db = getDatabase(app);

        // loom/pedal events -> DBwriter actions in methods
        this.loom = loomHandle;       
        this.pedals = pedalsHandle;

        // DBlistener events -> loom/pedal actions
        //  event handlers in methods
        this.dbstatus = new DBStatus(this.db);
        this.dbstatus.pi_online.on('change', (e) => this.keepAlive());
        this.dbstatus.active_draft.on('change', (e) => this.handleActiveDraft(e));
        this.dbstatus.pick_data.on('change', (e) => this.readPickData(e));

        this.pedals.on('relay-ready', () => {
            this.dbstatus.v_pedal_states.on('change', (e) => {
                console.log('virtual pedal changed');
                this.pedals.toggleRelay();
            });
        });
        this.pedals.on('count', (e) => this.updatePedalNum(e));
        this.pedals.on('states', (e) => this.updatePedalStates(e));
        this.pedals.on('vacuum', () => { // only with fake HTTP pedals
            this.emit('tabby');
        });

        this.loom.on('connection', (e) => this.updateLoomOnline(e));
        this.loom.on('vacuum', (e) => this.updateVacuumOn(e));
    }

    /** When loom goes online/offline */
    updateLoomOnline(dbstatus) {
        console.log('comm.js: loom connection established');
        this.dbstatus.loom_online.setVal(dbstatus);
    }

    /** When vacuum pump goes on/off */
    updateVacuumOn(dbstatus) {
        console.log("comm.js: vacuum status from loom");
        this.dbstatus.vacuum_on.setVal(dbstatus);
        // this.updatePickData(this.dbstatus.pick_data.val);
        // console.log(this.pick_data);
    }

    readPickData() {
        this.dbstatus.pick_data.read();
        console.log("just read pick data");
        this.updatePickData(this.dbstatus.pick_data.val);  
        // this.pedals.toggleRelay();
    }

    sendPick() {
        console.log("send pick call");
        if (this.pick_data) {
            this.loom.sendPick(this.pick_data);
            this.pick_data = false;
            console.log("sent pick data", this.loom.pickNumber);
            this.dbstatus.loom_ready.setVal(false);
        } else {
            console.log("no pick data to send");
        }
    }

    /** When the loom sends a pick request */
    handleLoomReady(dbstatus) {
        console.log("comm.js: loom pick request");
        // this.dbstatus.pick_data.read();
        console.log("comm.js: what data do I have", this.pick_data);
        if (this.pick_data) {
            console.log("comm.js: pick data ready");
            this.loom.sendPick(this.pick_data);
        } else {
            console.log("comm.js: waiting for pick data");
        }
        // console.log("just read pick data");
        // const pd = this.updatePickData(this.dbstatus.pick_data.val);
        // console.log(this.pick_data, pd);
        this.dbstatus.loom_ready.setVal(dbstatus);
        // this.pedals.toggleRelay();
    }

    /** When the number of pedals changes */
    updatePedalNum(event) {
        console.log("comm.js: num pedals change");
        console.log(event);
        this.dbstatus.pedal_array.updateArray(event.numPedals, event.pedalStates);
    }

    /** When the pedal states change but NOT NUM */
    updatePedalStates(event) {
        console.log("comm.js: pedal states change");
        // console.log(event);
        this.pedals.toggleRelay();
        this.dbstatus.pedal_array.setNode(event.id, event.state);
    }

    handleActiveDraft(active) {
        if (active) {
            // get the row currently in the buffer
            this.updatePickData(this.dbstatus.pick_data.val);
            // this.sendPick();
            // start listening for "loom ready" pick requests
            this.dbstatus.pick_data.on('change', (e) => {
                if (e) {
                    console.log("active draft, updating pick");
                    this.updatePickData(e);
                    if (this.dbstatus.loom_ready.val) {
                        this.sendPick();
                    }
                }
            });
            this.loom.once('vacuum', (e) => {
                this.updateVacuumOn(e);
                this.loom.vacuumOn();
                this.sendPick();
                // this.pedals.toggleRelay();
                this.loom.once('vacuum', (e) => {
                    this.updatePickData(this.dbstatus.pick_data.val);
                    // console.log(this.pick_data);
                    setTimeout(() => this.pedals.toggleRelay(), 800);
                });
                // after the first pick, start listening for pick requests
                this.loom.on('pick-request', (e) => this.handleLoomReady(e));
            });
            this.loom.vacuumOn();
        } else {
            this.loom.vacuumOff();
        }
    }

    // startWeaving() {
	// 	// short sequence of events: user sends "active draft" from software indicating weaving start
	// 	this.loom.once('vacuum', (v) => {
	// 		if (v) {
	// 			this.loom.once('vacuum', () => {
    //                 this.loom.on('pick-request', 
	// 				this.sendPick(firstPick);
	// 				this.
	// 			}
	// 		}
	// 	})
	// 	this.vacuumOn();

	// 	// pi sends vacuum on
	// 	// loom sends confirm 1
	// 	// loom sends confirm 2
	// 	// pi toggles relay for loom to open shed
	// }

    /** data comes in as a string from DB */
    updatePickData(data) {
        console.log("comm.js: updated pick data");
        if (data) {
            let pickNum = this.dbstatus.num_picks.val;
            console.log("comm.js: loom pick: "+this.loom.pickNumber+ " / db pick: "+pickNum);
            this.pick_data = [];
            for (var i of data) {
                let x = (parseInt(i) == 1) ? true : false;
                this.pick_data.push(x);
            } 
            // this.loom.sendPick(dataArray);
            // console.log("comm.js: ", dataArray);
        }
        return this.pick_data;
    }

    /** Maintaining pi_online when running */
    keepAlive() {
        this.dbstatus.pi_online.setVal(true);
        console.log("comm.js: stayin' alive");
    }
}

module.exports = {
    DBPipe
}

// true if this file is run via command line, but
// false if run by a require statement
if (require.main === module) {
    // var usingPi = false;
    var realLoom = false;
    var realPedals = false;

    const loom = new LoomHandle(6, 3, realLoom);
    const pedals = new PedalServer();
    const dbcon = new comm.js(loom, pedals);

    dbcon.keepAlive();
    // jean_luc.vacuumOn();
    // jean_luc.vacuumOff();
}