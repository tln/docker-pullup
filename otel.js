// Deploy events to OpenTelemetry: one OTLP/HTTP (JSON) log record per finished
// service update. Configured with the standard OTEL_* env vars; with no
// endpoint set this module does nothing. Sends are fire-and-forget: a slow or
// failed collector never fails or delays a deploy.
const SEVERITY = {  // OTLP SeverityNumber
    ok: [9, 'INFO'],
    rolled_back: [13, 'WARN'],
    failed: [17, 'ERROR'],
};
const SEND_TIMEOUT_MS = 5000;

module.exports = function ({emitter}) {
    const env = process.env;
    const url = env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT
        || (env.OTEL_EXPORTER_OTLP_ENDPOINT
            && env.OTEL_EXPORTER_OTLP_ENDPOINT.replace(/\/+$/, '') + '/v1/logs');
    if (!url) return;
    console.log('otel: sending deploy events to', url);

    const headers = Object.assign(
        {'Content-Type': 'application/json'},
        parseKeyValues(env.OTEL_EXPORTER_OTLP_HEADERS),
    );
    const resource = Object.assign(
        {'service.name': 'pullup', 'service.version': env.PULLUP_VERSION || 'dev'},
        parseKeyValues(env.OTEL_RESOURCE_ATTRIBUTES),
        env.OTEL_SERVICE_NAME && {'service.name': env.OTEL_SERVICE_NAME},
    );

    emitter.on('update', send);
    emitter.on('updateErr', send);

    function send(info) {
        if (info.what !== 'service') return;
        fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(deployLogs(resource, info)),
            signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
        })
        .then(res => { if (!res.ok) console.error('otel: collector said', res.status); })
        .catch(err => console.error('otel:', err.message));
    }
};

function deployLogs(resource, info) {
    const {result = info.err ? 'failed' : 'ok'} = info;
    const [severityNumber, severityText] = SEVERITY[result];
    const now = String(BigInt(Date.now()) * 1000000n);
    const attributes = {
        'event.name': 'deploy',
        // Not service.name: backends that flatten resource and record
        // attributes would collide with the resource's service.name=pullup.
        'deploy.service': info.name,
        'image.old': info.imageOld,
        'image.new': info.pinnedTag,
        'deploy.result': result,
        'deploy.duration_ms': info.durationMs,
    };
    if (info.err) attributes['error.message'] = String(info.err.message || info.err);
    return {
        resourceLogs: [{
            resource: {attributes: toKeyValues(resource)},
            scopeLogs: [{
                scope: {name: 'pullup'},
                logRecords: [{
                    timeUnixNano: now,
                    observedTimeUnixNano: now,
                    eventName: 'deploy',
                    severityNumber,
                    severityText,
                    body: {stringValue: `deploy ${info.name} ${result}`},
                    attributes: toKeyValues(attributes),
                }],
            }],
        }],
    };
}

function toKeyValues(obj) {
    return Object.entries(obj)
        .filter(([, v]) => v !== undefined && v !== null)
        .map(([key, v]) => ({key, value: Number.isInteger(v)
            ? {intValue: String(v)}
            : {stringValue: String(v)}}));
}

// "k1=v1,k2=v2" with percent-encoded values (OTEL_RESOURCE_ATTRIBUTES,
// OTEL_EXPORTER_OTLP_HEADERS).
function parseKeyValues(s) {
    const out = {};
    for (const pair of (s || '').split(',')) {
        const i = pair.indexOf('=');
        if (i < 1) continue;
        try {
            out[pair.slice(0, i).trim()] = decodeURIComponent(pair.slice(i + 1).trim());
        } catch (err) {
            console.error('otel: bad key=value', pair);
        }
    }
    return out;
}

module.exports.deployLogs = deployLogs;
module.exports.parseKeyValues = parseKeyValues;
