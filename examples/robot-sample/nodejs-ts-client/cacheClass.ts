
import * as fs from 'fs';



class CacheClass {
    getCache():{dictVersion:string,protoVersion:string,dict:any,protos:any}{
        try{
            return JSON.parse(fs.readFileSync(__dirname+'/cache.tmp').toString())as any;
        }catch (err){
            return null;
        }
    }

    saveCache(cache){
        fs.writeFileSync(__dirname+'/cache.tmp',JSON.stringify(cache,null,4));
    }
}


export const cacheClass = new CacheClass();
