// 定义会话对象类型
export interface ChatSession {
    id: string;
    title: string;
    isActive: boolean;
    userId: number;
    createTime: string;
    updateTime: string;
}
// 定义会话消息类型
export interface ChatMessage {
    id: string;
    role: 'user' | 'system';
    content: string;
    chatId: string;
    createdAt: string;
    imgUrl: string[] | null;
    fileContent:
        | {
            fileId: string;
            fileName: string;
          }[]
        | null
}