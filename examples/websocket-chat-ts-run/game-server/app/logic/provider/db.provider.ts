
// more examples
// https://docs.nestjs.com/fundamentals/custom-providers


export const databaseProvider = {
    provide: "mydatabase",
    useFactory: async () => {
        // create redis,mongodb,mysql etc.
        return {
            hget: () => { console.log("mydatabase hget") },
            hset: () => { console.log("mydatabase hset") },
        }
    }
}
