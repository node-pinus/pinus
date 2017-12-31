import { Application } from "../application";

export interface ILifeCycle
{
    beforeStartup ?: (app:Application , cb : ()=>void)=>void;
    beforeShutdown ?: (app:Application , shutDown : ()=>void , cancelShutDownTimer : ()=>void)=>void;
    afterStartup ?: (app:Application , cb : ()=>void)=>void;
    afterStartAll ?: (app:Application)=>void;
}