var timeout;
module.exports = function ({state, emitter}) {
    state.busy = 0;
    if (process.env.PULLUP_IDLE_EXIT) {
        var delay = +process.env.PULLUP_IDLE_EXIT * 1000;
        emitter.on('start', () => setTimeout(shutdown, delay));
    }

    // Shutdown process after a few seconds have passed
    function shutdown() {
        // Give us 5 more seconds if some process is busy
        if (state.busy) return setTimeout(shutdown, 5*1000);
        console.log('Idle shutdown');
        emitter.emit('stop');
    }
}
