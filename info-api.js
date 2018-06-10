module.exports = function ({app, state}) {
    state.info = {};
    app.get('/', (req, res) => {
        state.info.mem = process.memoryUsage();
        res.json(state.info);
    });
}