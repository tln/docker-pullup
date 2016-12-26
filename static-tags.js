module.exports = function ({app, state}) {
    var tagsSpec = process.env.PULLUP_TAGS;
    state.tags = tagsSpec ? tagsSpec.split(/[, ]/) : [];
    
    app.get('/tags', (req, res) => {
        res.json(state.tags);
    });
    if (process.env.PULLUP_DYNAMIC_TAGS) {
        app.post('/tags', (req, res) => {
            state.tags = req.body;
        });
    }
}
