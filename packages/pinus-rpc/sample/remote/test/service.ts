// remote service
export default function (app: any) {
    return new Service(app);
}

export class Service {
    constructor(private app: any) {
    }
    async echo(msg: string, data: number) {
        // setTimeout(function() {
        // console.log(msg);
        // console.log(data);
        return msg;
        // cb(null, msg, 'aaa' + Date.now());
        // }, 15000);
    }
}