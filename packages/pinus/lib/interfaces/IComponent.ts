

export interface IComponent {
    name: string;
    /**
     * Component lifecycle callback
     *
     * @param {Function} cb
     * @return {Void}
     */
    beforeStart?: (cb: () => void) => void;

    /**
     * Component lifecycle callback
     *
     * @param {Function} cb
     * @return {Void}
     */
    start ?: (cb: () => void) => void;

    /**
     * Component lifecycle callback
     *
     * @param {Function} cb
     * @return {Void}
     */
    afterStart?: (cb: () => void) => void;

    /**
     * Component lifecycle callback
     * 所有进程启动好以后的通知。单个进程重启是不会有这个通知的。
     * 如果单独重启了master。 master内会有一个计数器。 其它进程重启到这个次数，就会发送这个通知（也就是说有可能重复通知afterStartAll）。
     * 可以通过注册使用 RestartNotifyModule admin模块，来实现重启单个逻辑进程时通知这个事件（这个模块可以避免重复通知）。
     *
     * @return {Void}
     */
    afterStartAll ?: () => void;

    /**
     * Component lifecycle function
     *
     * @param {Boolean}  force whether stop the component immediately
     * @param {Function}  cb
     * @return {Void}
     */
    stop?: (force: boolean, cb: () => void) => void;
}