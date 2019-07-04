import { ILifeCycle, Application } from 'pinus';

export default function () {
    return new Lifecycle();
}


class Lifecycle implements ILifeCycle {
    beforeStartup(app: Application, cb: () => void): void {
        console.log(app.getServerId(), '!!!before startup');
        cb();
    }

    afterStartup(app: Application, cb: () => void): void {
        console.log(app.getServerId(), '!!afterStartup');
        cb();
    }

    afterStartAll(app: Application): void {
        console.log(app.getServerId(), '!!after start all');
    }

    beforeShutdown(app: Application, shutDown: () => void, cancelShutDownTimer: () => void) {
        console.log(app.getServerId(), '!!beforeShutdown');
        shutDown();
    }
}