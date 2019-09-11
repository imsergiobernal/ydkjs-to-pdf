module.exports = function(http) {
    return {
        getLatestCommit: async (account, repository) => {
            const { data } = await http.get(`https://api.github.com/repos/${account}/${repository}/commits`);
            return data[0];
        },

        getRaw: (account, repository, path) => {
            return http
                .get(`https://raw.githubusercontent.com/${account}/${repository}/${path}`)
        }
    }
}
