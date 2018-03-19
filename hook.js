module.exports = function ({emitter, app}) {
    app.post('/hook', processHook);

    function processHook(req, res) {
        var data = req.body;
        handleEvents(data.events||[]);
        res.json({});
    }
    function handleEvents(events) {
        for (var event of events) {
            if (event.action !== 'push') continue;
            try { 
                var extracted = extractEventInfo(event);
                emitter.emit('push', extracted);
            } catch(e) {
                console.error('Error on push event', e);
            }
        }
    }
}

function extractEventInfo(event) {
    // Cobble together the tag for the image from various 
    // parts of the event. We assume the request host is
    // part of the tag.
    var tag = `${event.request.host}/${event.target.repository}:${event.target.tag||'latest'}`;
    return {tag, originalEvent: event, digest: event.target.digest};
}
