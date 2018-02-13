const client = require('../index')();
const env = require('getenv');
const [topic, subscription] = [env.string('SB_TOPIC_PATH'), env.string('SB_SUBSCRIPTION_PATH')];

let idx = 0;
async function send() {
    try {
        await client.publish(topic, { msg: `Message #${++idx}`, license: '0;0;0' });
    } catch (e) {
        console.error(e);
    }
}

(async () => {   
    // enable proxy if wanted
    if (env.string('http_proxy', ''))
        require('global-tunnel').initialize();
    
    // first, send some message
    for (let i of [...new Array(10)]) {
        await send();
    }

    // then start sending messages periodically
    let sendTimer = setInterval(send, 10000);    

    // start receiving messages
    let subscriber = client.subscribe({ topicPath: topic, subscriptionPath: subscription, options: { deletionMode: 'immediatedelete' } });

    subscriber.on('message', message => {
       // do nothing 
    });

    subscriber.on('error', err => {
        console.error(err);
    });
    subscriber.on('receive', (info) => {
        let out = `${new Date()} ${info.timers.averageReceival}, ${info.timers.lastReceiveElapsed}, ${info.message ? info.message.body : 'no message'}`; 
        console.log(out);
    });
    subscriber.start();
})();
