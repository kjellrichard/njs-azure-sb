const Client = require('./lib/SbClient');

module.exports = (options) => {
    return new Client(options || require('./config')());
};