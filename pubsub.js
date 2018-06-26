const PubSub = require('@google-cloud/pubsub')
const pubsub = PubSub();

let private = {};
module.exports = async function ({emitter, state}) {
    if (process.env.PULLUP_PUBSUB) {
        let config = getConfig();
        state.pubsub = {config};
        private.subscription = await subscribe(config);
        private.subscription.on('message', handleCloudBuildMessage.bind(state.pubsub, emitter));
        console.log(`pubsub: waiting on cloud build messages on ${config.subName}`);
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

/**
 * Process incoming cloudbuild messages.
 * When we get a SUCCESS message with images, 
 * emit a "push" for each image built.
 */
function handleCloudBuildMessage(emitter, message) {
    message.ack();
    let {status} = message.attributes;
    let data = JSON.parse(message.data);
    if (status === 'SUCCESS' && data.results.images) {
        for (let {name: tag, digest} of data.results.images) {
            console.log('Cloud build image built:', tag, digest);
            if (tag && digest) emitter.emit('push', {tag, digest});
        }
    } else {
        let {images} = data;
        emitter.emit('build_'+status.toLowerCase(), images);
    }
}
