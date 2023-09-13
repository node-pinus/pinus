module.exports = {
    'onChat': {
        'required string msg': 1,
        'required string from': 2,
        'required string target': 3
    },
    "message objectValue": {
        "optional string a": 1,
        "optional uInt32 b": 2,
        "optional bool c": 3
    },
    "message mapValue": {
        "optional string d": 1,
        "optional uInt32 e": 2,
        "optional bool f": 3
    },
    "gate.gateHandler.protobufTest": {
        "message messageObject": {
            "optional string key": 1,
            "optional objectValue value": 2
        },
        "message messageMap": {
            "optional string key": 1,
            "optional mapValue value": 2
        },
        "required string username": 1,
        "obj messageObject obj": 2,
        "map messageMap map": 3
    }
};
