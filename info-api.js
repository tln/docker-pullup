module.exports = function ({app, state}) {
    state.info = {
        version: process.env.PULLUP_VERSION || 'dev',
        revision: process.env.PULLUP_REVISION || 'unknown',
    };
    console.log(`pullup ${state.info.version} (${state.info.revision})`);
    app.get('/', (req, res) => {
        state.info.mem = process.memoryUsage();
        res.json(state.info);
    });
}
