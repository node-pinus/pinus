import { INestApplicationContext } from "@nestjs/common";
import { Application, pinus } from "pinus";

export function getNestClass(app: Application, classz: any, module?: any) {
    let root: INestApplicationContext = app.get('nestjs');
    if (module) {
        root = root.select(module);
    }
    if (!root) {
        return null;
    }
    try {
        let cls = root.get(classz);
        return cls;
    } catch (e) {
        // 给RPC用来读取 方法名用的
        return classz.prototype;
    }
}

// pinus 需要先初始化
export const pinusAppProvider = {
    provide: Application,
    useValue: pinus.app,
}
