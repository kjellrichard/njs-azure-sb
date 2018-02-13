const _ = require('lodash');
const sb = require('azure-sb');
const { promisify } = require('util'); 
const Subscriber = require('./Subscriber');
const https = require('https');

class SbClient {
    constructor(connectionConfig, options) {
        this._service = sb.createServiceBusService(connectionConfig);         
    }

    async publish(topic, body) {    
        let message = {
            body: JSON.stringify(body)
        };
        return new Promise((resolve, reject) => {
            //let message = new sb.Azure.ServiceBus.

            this._service.sendTopicMessage(topic,message, (err, result) => {
                if (err) return reject(err);
                resolve(result);
            })
        });
    }

    subscribe(subscription, handler, errorHandler) {
        let sub = Object.assign({}, { service: this._service }, subscription)
        return new Subscriber(
            sub,
            _.isFunction(handler) ? handler : undefined,
            _.isFunction(errorHandler) ? errorHandler : undefined
        );
    }

    async receive(topic, subscriptionName, options = {}) {
        options = Object.assign({}, { isPeekLock: true }, options);
        return new Promise((resolve, reject) => {
            this._service.receiveSubscriptionMessage(topic, subscriptionName, (err, message) => {
                if (err) reject(err);
                resolve(message);
            }) 
        });
    }
}

module.exports = SbClient;