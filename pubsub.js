const PubSub = require('@google-cloud/pubsub')
const pubsub = PubSub();

let private = {};
module.exports = async function ({emitter, state}) {
    if (process.env.PULLUP_PUBSUB) {
        let config = getConfig();
        state.pubsub = {config};
        private.subscription = await subscribe(config);
        private.subscription.on('message', handleCloudBuildMessage.bind(state.pubsub, emitter));
        console.log(`cb: waiting on cloud build messges on ${config.subName}`);
    }
}

function getConfig() {
    return {
        subName: process.env.PULLUP_PUBSUB_SUBSCRIPTION || 'docker-pullup',
        topic: process.env.PULLUP_PUBSUB_TOPIC || 'cloud-builds',
        autoSubscribe: process.env.PULLUP_PUBSUB_AUTOSUBSCRIBE !== 'no'
    };
}

async function subscribe({subName, topic, autoSubscribe}) {
    let subscription = pubsub.subscription(subName);
    let [exists] = await subscription.exists();
    if (!exists) {
        [subscription] = await pubsub.createSubscription(topic, subName);
    }
    return subscription;
}

function handleCloudBuildMessage(emitter, message) {
    message.ack();
    let data = JSON.parse(message.data);
    console.log('cb:', JSON.stringify(JSON.parse(message.data), null, 4));
    let {status} = message.attributes;
    if (status !== 'SUCCESS') return;
    let {name: tag, digest} = data.results.images[0];
    console.log('cb->', tag, digest);
    if (tag && digest) emitter.emit('push', {tag, digest});
}
