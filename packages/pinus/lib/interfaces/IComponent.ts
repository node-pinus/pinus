

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