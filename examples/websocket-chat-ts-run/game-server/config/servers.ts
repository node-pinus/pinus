module.exports = {
    'development': {
        'connector': [
            {
                'id': 'connector-server-1',
                'host': '127.0.0.1',
                'port': 4050,
                'clientPort': 3050,
                'frontend': true,
                'args': '--inspect=10001'
            }
        ],
        'chat': [
            {'id': 'chat-server-1', 'host': '127.0.0.1', 'port': 6050, 'args': '--inspect=10002'}
        ],
        'gate': [
            {
                'id': 'gate-server-1',
                'host': '127.0.0.1',
                'clientPort': 3014,
                'frontend': true,
                'args': '--inspect=10003'
            }
        ]
    },
    'ci': {
        'connector': [
            {
                'id': 'connector-server-1',
                'host': '127.0.0.1',
                'port': 4051,
                'clientPort': 3051,
                'frontend': true,
                'args': ''
            }
        ],
        'chat': [
            {'id': 'chat-server-1', 'host': '127.0.0.1', 'port': 6051, 'args': ''}
        ],
        'gate': [
            {
                'id': 'gate-server-1',
                'host': '127.0.0.1',
                'clientPort': 3015,
                'frontend': true,
                'args': ''
            }
        ]
    },
    'production': {
        'connector': [
            {'id': 'connector-server-1', 'host': '127.0.0.1', 'port': 4050, 'clientPort': 3050, 'frontend': true},
            {'id': 'connector-server-2', 'host': '127.0.0.1', 'port': 4051, 'clientPort': 3051, 'frontend': true},
            {'id': 'connector-server-3', 'host': '127.0.0.1', 'port': 4052, 'clientPort': 3052, 'frontend': true}
        ],
        'chat': [
            {'id': 'chat-server-1', 'host': '127.0.0.1', 'port': 6050},
            {'id': 'chat-server-2', 'host': '127.0.0.1', 'port': 6051},
            {'id': 'chat-server-3', 'host': '127.0.0.1', 'port': 6052}
        ],
        'gate': [
            {'id': 'gate-server-1', 'host': '127.0.0.1', 'clientPort': 3014, 'frontend': true}
        ]
    }
};
