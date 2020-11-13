import { Application, IComponent } from "pinus";


export class TestComponent implements IComponent {
    name = "TestComponent";
    app: Application;

    constructor(app: Application) {
        this.app = app;
        this.app.set(this.name, this)
    }

    start(cb: () => void) {
        console.log("TestComponent  start", this.app.getServerId())
        cb()
    }

    stop(force: boolean, cb: () => void) {
        console.log("TestComponent stop", force, this.app.getServerId())
        cb()
    }
}