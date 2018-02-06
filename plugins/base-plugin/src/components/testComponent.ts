import { IComponent, Application } from 'pinus';


export class TestComponent implements IComponent {
    name = 'TestComponent';
    constructor(app: Application, opts: any) {
        console.log(`TestComponent constructor app:${app.getBase()} opts:${opts ? JSON.stringify(opts) : ''}`);
    }
}