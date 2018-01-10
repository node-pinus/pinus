let Parser = module.exports;

/**
 * [parse the original protos, give the paresed result can be used by protobuf encode/decode.]
 * @param  {[Object]} protos Original protos, in a js map.
 * @return {[Object]} The presed result, a js object represent all the meta data of the given protos.
 */
export function parse(protos: {[key: string]: any}) {
    let maps: {[key: string]: any} = {};
    for (let key in protos) {
        maps[key] = parseObject(protos[key]);
    }

    return maps;
}

/**
 * [parse a single protos, return a object represent the result. The method can be invocked recursively.]
 * @param  {[Object]} obj The origin proto need to parse.
 * @return {[Object]} The parsed result, a js object.
 */
function parseObject(obj: {[key: string]: any}) {
    let proto: {[key: string]: any} = {};
    let nestProtos: {[key: string]: any} = {};
    let tags: {[key: string]: any} = {};

    for (let name in obj) {
        let tag = obj[name];
        let params = name.split(' ');

        switch (params[0]) {
            case 'message':
                if (params.length !== 2) {
                    continue;
                }
                nestProtos[params[1]] = parseObject(tag);
                continue;
            case 'required':
            case 'optional':
            case 'repeated': {
                // params length should be 3 and tag can't be duplicated
                if (params.length !== 3 || !!tags[tag]) {
                    continue;
                }
                proto[params[2]] = {
                    option: params[0],
                    type: params[1],
                    tag: tag
                };
                tags[tag] = params[2];
            }
        }
    }

    proto.__messages = nestProtos;
    proto.__tags = tags;
    return proto;
}