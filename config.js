const env = require('getenv');

module.exports = (path) => {
    require('dotenv').config({
        silent: true,
        path: path || undefined
    });

    let connectionString = env.string('SB_CONNECTION_STRING',''); 
    if (connectionString)
        return connectionString;    
    return {
        // not yet
    }
}