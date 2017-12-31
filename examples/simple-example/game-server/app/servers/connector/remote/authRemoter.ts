import { Application, FrontendSession } from 'pinus';

export default function (app: Application)
{
    return new authRemoter(app);
};

export class authRemoter
{
    constructor(private app: Application)
    {

    };

    /**
     * 
     * @param username
     * @param password
     */
    async auth(username : string , password : string)
    {
        return true;
    };
    
}