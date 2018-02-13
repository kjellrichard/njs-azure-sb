const EventEmitter = require('events');

class Subscriber extends EventEmitter {
    constructor(subscription, handler, errorHandler) {
        super();
        this._service = subscription.service;
        this._topicPath = subscription.topicPath;
        this._subscriptionPath = subscription.subscriptionPath;
         
        this._options = Object.assign({}, {        
            baseInterval: 1000,
            deletionMode: 'manual'
        }, subscription.options);
        let deletionMode = this._options.deletionMode; 
        if (deletionMode == 'manual') { // just a peek, no deletion is done (and must be handled by the caller)
            this._options.isPeekLock = true;
        }
        if (deletionMode == 'autodelete') {
            this._options.isPeekLock = true; // peek first, deletion is done after "message" emit
            this._deleteAfterEmit = true;
        }

        if (deletionMode == 'immediatedelete') {
            this._options.isPeekLock = false; // no peek, message will be deleted on receival
        }
        this._flags = {
            stopped: false,
            running: false,        
        };
        this.counters = {
            messages: 0,
            errors: 0,
            tries: 0
        }

        this._timers = {
            networkWait: 0,
            averageReceival: 0,
            min: undefined,
            max: undefined
        }
        if (errorHandler)
            this.on('error', errorHandler); 
        
        if (handler) {
            this.on('message', handler);
            this.start();
        } 
           

    }

    updateTimers(elapsed) {
        let timers = this._timers;
        timers.networkWait += elapsed;
        timers.lastReceiveElapsed = elapsed;
        timers.averageReceival = Math.floor(timers.networkWait / this.counters.tries);
        if (!timers.min || timers.min > elapsed)
            timers.min = elapsed;
        if (!timers.max || timers.max < elapsed)
            timers.max = elapsed;    
    }

    getSingle() {    
        this._flags.running = true;
        let d = new Date();
        this._service.receiveSubscriptionMessage(this._topicPath, this._subscriptionPath, this._options, (err, message) => {
            this.counters.tries++;
            let elapsed = (new Date()).getTime() - d.getTime();
            this.updateTimers(elapsed);
            this._flags.running = false;
            this.emit('receive', {error: err, message: message, timers: this._timers});
            
            if (err) {
                if (/no messages to receive/i.test(err))
                    return this.noMessage();  
                this.counters.errors++;
                return this.errorHandler(err);
            }
            this.counters.messages++;
            this.handler(message);
        });
    }

    noMessage() {
        this.schedule();
    }

    errorHandler(err) {
        
        this.emit('error', err);
    }

    deleteMessage(message, cb) {
        this._service.deleteMessage(message, (err) => {
            if (err) return this.errorHandler(err);
            if (cb)
                cb();    
            this.emit('delete', message);
        })
    }

    handler(message) {        
        this.emit('message', message);
        if (!!this._deleteAfterEmit) {
            this.deleteMessage(message, this.schedule.bind(this,[1]));
        } else 
            this.schedule(1);
    }

    schedule(delay) {    
        if (this._flags.stopped)
            return;
        if (this._flags.running)
            return;    
        this._timer = setTimeout(this.getSingle.bind(this), delay || this._options.baseInterval);
    }

    start() {
        this._flags.stopped = false;
        this.schedule(1);
    }

    stop() {
        this._flags.stopped = true;
        this._flags.running = false;
        if (this._timer)
            clearTimeout(this._timer);    
    }
}

module.exports = Subscriber;