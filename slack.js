const SLACK_MESSAGES = {
    update: ({pinnedTag}) => `service was updated! ${pinnedTag}`,
    updateErr: ({err, pinnedTag}) => `ERROR updating service ${pinnedTag} ${err}`,
};
const VERBOSE_SLACK_MESSAGES = {
    start: () => 'pullup starting',
    build_working: (image) => `build started for ${image}`,
    build_failure: (image) => `build failed for ${image}`,
};
var slack_messages;
module.exports = function ({emitter}) {
    if (process.env.PULLUP_SLACK_WEBHOOK) {
        slack_messages = Object.assign(
            {}, 
            SLACK_MESSAGES, 
            process.env.PULLUP_SLACK_VERBOSE ? VERBOSE_SLACK_MESSAGES : {}
        );
        emitter.on('*', handle_events);
    }
}

function handle_events(event, ...args) {
    let formatter = slack_messages[event];
    if (formatter) send_message(formatter(...args));
}

function send_message(text) {
    fetch(process.env.PULLUP_SLACK_WEBHOOK, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({text}),
    }).catch(err => console.error('slack:', err));
}