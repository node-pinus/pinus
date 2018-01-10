// remote service
export default function (app: any) {
    return new service(app);
}

export class service {
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