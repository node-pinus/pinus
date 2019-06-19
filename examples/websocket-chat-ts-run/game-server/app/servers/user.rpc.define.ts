
// 这种

// UserRpc的命名空间自动合并
import { FrontendSession, RemoterClass } from "pinus";
import { ChatRemote } from "./chat/remote/chatRemote";

declare global {
    interface UserRpc {
        chat: {
            chatRemote: RemoterClass<FrontendSession, ChatRemote>;
        };
    }
}