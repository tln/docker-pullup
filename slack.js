const SlackWebhook = require('slack-webhook')
const SLACK_MESSAGES = {
    update: ({pinnedTag}) => `service was updated! ${pinnedTag}`,
    updateErr: ({err, pinnedTag}) => `ERROR updating service ${pinnedTag} ${err}`,
};
const VERBOSE_SLACK_MESSAGES = {
    start: () => 'pullup starting',
    build_working: (image) => `build started for ${image}`,
    build_failure: (image) => `build failed for ${image}`,
};
var slack, slack_messages;
module.exports = function ({emitter}) {
    if (process.env.PULLUP_SLACK_WEBHOOK) {
        slack = new SlackWebhook(process.env.PULLUP_SLACK_WEBHOOK);
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

function send_message(message) {
    slack.send(message);
}