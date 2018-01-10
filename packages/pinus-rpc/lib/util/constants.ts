export let constants = {
    FAIL_MODE: {
        FAILOVER: 'failover',
        FAILFAST: 'failfast',
        FAILSAFE: 'failsafe',
        FAILBACK: 'failback'
    },
    SCHEDULE: {
        ROUNDROBIN: 'rr',
        WEIGHT_ROUNDROBIN: 'wrr',
        LEAST_ACTIVE: 'la',
        CONSISTENT_HASH: 'ch'
    },
    DEFAULT_PARAM: {
        FAILSAFE_RETRIES: 3,
        FAILSAFE_CONNECT_TIME: 5 * 1000,
        CALLBACK_TIMEOUT: 30 * 1000,
        INTERVAL: 50,
        GRACE_TIMEOUT: 3 * 1000,
        DEFAULT_PENDING_SIZE: 10000,
        KEEPALIVE: 10 * 1000
    },
    RPC_ERROR: {
        SERVER_NOT_STARTED: 1,
        NO_TRAGET_SERVER: 2,
        FAIL_CONNECT_SERVER: 3,
        FAIL_FIND_MAILBOX: 4,
        FAIL_SEND_MESSAGE: 5,
        FILTER_ERROR: 6
    },
    TOPIC_RPC: 'r',
    TOPIC_HANDSHAKE: 'h'
};