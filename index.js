const Client = require('./lib/SbClient');

module.exports = (connectionConfig, options = {}) => {
    return new Client(connectionConfig || require('./config')(), options);
};