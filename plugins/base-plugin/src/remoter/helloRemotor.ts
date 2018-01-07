import { Application } from "pinus";


export class helloRemotor
{
    constructor(private app: Application)
    {

    }
    /**
     * 一个rpc函数的实现（给后端请求）
     * @param message rpc的参数，可以有多个
     * @returns 异步返回
     */
    public async hello(message : string)
    {
        return message;
    }
}

export default function(app : Application)
{
    return new helloRemotor(app)
}
