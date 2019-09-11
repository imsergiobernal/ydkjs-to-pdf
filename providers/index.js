const githubProvider = require('./github');

module.exports = function(http) {
    return {
        githubProvider: githubProvider(http)
    }
}