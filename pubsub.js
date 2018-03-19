const PubSub = require('@google-cloud/pubsub')
const pubsub = PubSub();

let private = {};
module.exports = async function ({emitter, state}) {
    if (process.env.PULLUP_PUBSUB) {
        let config = getConfig();
        state.pubsub = {config, last: []};
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
    
    let {status} = message.attributes;
    let {images:[image]} = JSON.parse(message.data);

    // Save recent messages for debugging
    this.last.push({status, image, ts: (new Date)+''});
    if (this.last.length > 5) this.last.shift();

    if (status !== 'SUCCESS') return;
    console.log('cb->', image);
    if (image) emitter.emit('push', {tag:image});
}
