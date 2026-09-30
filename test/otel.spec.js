const http = require('http');
const EventEmitter = require('events');
const otel = require('../otel');

const OTEL_VARS = ['OTEL_EXPORTER_OTLP_ENDPOINT', 'OTEL_EXPORTER_OTLP_LOGS_ENDPOINT',
    'OTEL_EXPORTER_OTLP_HEADERS', 'OTEL_RESOURCE_ATTRIBUTES', 'OTEL_SERVICE_NAME'];

function attrs(keyValues) {
    return Object.fromEntries(keyValues.map(({key, value}) =>
        [key, 'intValue' in value ? Number(value.intValue) : value.stringValue]));
}

describe('otel deploy events', () => {
    let server, received, saved;

    beforeEach(async () => {
        saved = Object.fromEntries(OTEL_VARS.map(k => [k, process.env[k]]));
        OTEL_VARS.forEach(k => delete process.env[k]);
        received = [];
        server = http.createServer((req, res) => {
            let body = '';
            req.on('data', c => body += c);
            req.on('end', () => {
                received.push({url: req.url, headers: req.headers, body: JSON.parse(body)});
                res.end('{}');
            });
        });
        await new Promise(r => server.listen(0, '127.0.0.1', r));
    });

    afterEach(async () => {
        await new Promise(r => server.close(r));
        OTEL_VARS.forEach(k => saved[k] === undefined ? delete process.env[k] : process.env[k] = saved[k]);
    });

    const waitFor = async (n) => {
        for (let i = 0; i < 100 && received.length < n; i++) await new Promise(r => setTimeout(r, 10));
    };

    test('sends one log record per service update', async () => {
        process.env.OTEL_EXPORTER_OTLP_ENDPOINT = `http://127.0.0.1:${server.address().port}/`;
        process.env.OTEL_RESOURCE_ATTRIBUTES = 'host.name=web%201,deployment.environment=test';
        process.env.OTEL_EXPORTER_OTLP_HEADERS = 'x-token=abc';
        const emitter = new EventEmitter();
        otel({emitter});

        emitter.emit('update', {what: 'service', name: 'myapp_web', result: 'ok', durationMs: 41200,
            imageOld: 'registry.example.com/myapp:1@sha256:aaa',
            pinnedTag: 'registry.example.com/myapp:1@sha256:bbb'});
        await waitFor(1);

        expect(received).toHaveLength(1);
        const {url, headers, body} = received[0];
        expect(url).toBe('/v1/logs');
        expect(headers['content-type']).toBe('application/json');
        expect(headers['x-token']).toBe('abc');
        const {resource, scopeLogs} = body.resourceLogs[0];
        expect(attrs(resource.attributes)).toMatchObject(
            {'host.name': 'web 1', 'deployment.environment': 'test', 'service.name': 'pullup'});
        const [record] = scopeLogs[0].logRecords;
        // Backends drop records without a timestamp (they read as 1970).
        expect(Math.abs(Number(BigInt(record.timeUnixNano) / 1000000n) - Date.now())).toBeLessThan(5000);
        expect(record.severityText).toBe('INFO');
        expect(record.eventName).toBe('deploy');
        expect(attrs(record.attributes)).toEqual({
            'event.name': 'deploy',
            'deploy.service': 'myapp_web',
            'image.old': 'registry.example.com/myapp:1@sha256:aaa',
            'image.new': 'registry.example.com/myapp:1@sha256:bbb',
            'deploy.result': 'ok',
            'deploy.duration_ms': 41200,
        });
    });

    test('reports rolled back and failed updates', async () => {
        process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT = `http://127.0.0.1:${server.address().port}/custom`;
        const emitter = new EventEmitter();
        otel({emitter});

        emitter.emit('updateErr', {what: 'service', name: 'web', result: 'rolled_back',
            durationMs: 5, err: new Error('update rolled back')});
        emitter.emit('updateErr', {what: 'service', name: 'web', durationMs: 5, err: 'no such image'});
        await waitFor(2);

        expect(received.map(r => r.url)).toEqual(['/custom', '/custom']);
        const records = received.map(r => r.body.resourceLogs[0].scopeLogs[0].logRecords[0]);
        const results = records.map(r => [r.severityText, attrs(r.attributes)['deploy.result']]).sort();
        expect(results).toEqual([['ERROR', 'failed'], ['WARN', 'rolled_back']]);
        expect(records.map(r => attrs(r.attributes)['error.message']).sort())
            .toEqual(['no such image', 'update rolled back']);
    });

    test('does nothing without an endpoint', () => {
        const emitter = new EventEmitter();
        otel({emitter});
        expect(emitter.listenerCount('update')).toBe(0);
        expect(emitter.listenerCount('updateErr')).toBe(0);
    });

    test('an unreachable collector does not throw', async () => {
        process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://127.0.0.1:1';
        const emitter = new EventEmitter();
        otel({emitter});
        const errors = jest.spyOn(console, 'error').mockImplementation(() => {});
        expect(() => emitter.emit('update', {what: 'service', name: 'web', durationMs: 1})).not.toThrow();
        for (let i = 0; i < 100 && !errors.mock.calls.length; i++) await new Promise(r => setTimeout(r, 10));
        expect(errors.mock.calls[0][0]).toBe('otel:');
        errors.mockRestore();
    });
});
