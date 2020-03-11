"use strict";

exports.default = function(app) {
    return new AuthRemoter(app);
}

class AuthRemoter {
    constructor(app) {
        this.app = app;
    }

    /**
     *
     * @param username
     * @param password
     */
    async auth(username, password) {
        return true;
    }

    // 私有方法不会加入到RPC提示里
    async privateMethod(testarg, arg2) {

    }
}