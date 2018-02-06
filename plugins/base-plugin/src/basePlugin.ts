import { Application , IPlugin , getPluginHandlerPath , getPluginRemotePath} from 'pinus';
import { TestComponent } from './components/testComponent';


/**
 * 实现一个基本的插件，插件载入时，会被自动扫描handlerPath和remoterPath指向的目录
 */
export class BasePlugin implements IPlugin {
    name = 'basePlugin';
    components = [TestComponent];

    // 在插件里扫描handler目录
    handlerPath = getPluginHandlerPath(__dirname);
    // 在插件里扫描remoter目录
    remoterPath = getPluginRemotePath(__dirname);
}
