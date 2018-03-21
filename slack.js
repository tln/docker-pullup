const SlackWebhook = require('slack-webhook')
const SLACK_MESSAGES = {
    start: () => 'pullup starting',  // DEBUG -- this is pretty wordy
    push: (image) => `push: ${image}`,
    update: ({pinnedTag}) => `service was updated! ${pinnedTag}`,
    build_started: (image) => `build started for ${image}`,
    build_failed: (image) => `build failed for ${image}`,
};
var slack;
module.exports = function ({emitter}) {
    if (process.env.PULLUP_SLACK_WEBHOOK) {
      slack = new SlackWebhook(process.env.PULLUP_SLACK_WEBHOOK);
      emitter.on('*', handle_events);
    }
}

function handle_events(event, ...args) {
    let formatter = SLACK_MESSAGES[event];
    if (formatter) send_message(formatter(...args));
}

function send_message(message) {
    slack.send(message);
}