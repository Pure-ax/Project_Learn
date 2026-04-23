import { UserOutlined } from '@ant-design/icons'
import { Bubble } from '@ant-design/x'
import { useRef } from 'react'

import { useChatStore, useConversationStore } from '@pc/store'

import { allMessageContent } from './content'

import type { MessageContent } from '@pc/types/chat'
import type { GetProp, GetRef } from 'antd'
import './bubble.css' // 添加CSS导入
import 'highlight.js/styles/github.css'

export const ChatBubble = () => {
    const listRef = useRef<GetRef<typeof Bubble.List>>(null)
    const { messages } = useChatStore()
    const { selectedId } = useConversationStore()

    // roles相当于bubble的角色皮肤，每一个roles都是一个角色，再对角色进行配置，可复用性极高
    // 实际上就是解决了手懒的问题，不用自己手写一堆类型、数组对象和判断，初学还是有点费劲，后期用起来应该会很便捷
    const rolesAsObject: GetProp<typeof Bubble.List, 'roles'> = {
        system: {
            placement: 'start',
            avatar: { icon: <UserOutlined />, style: { background: '#fde3cf' } },
            variant: 'borderless',
            style: {
                maxWidth: '100%'
            }
        },
        user: {
            placement: 'end',
            avatar: { icon: <UserOutlined />, style: { background: '#87d068' } }
        },
        file: {
            placement: 'end',
            variant: 'borderless'
        },
        image: {
            placement: 'end',
            variant: 'borderless'
        }
    }

    const chatMessage = selectedId ? messages.get(selectedId) : []

    // 渲染消息内容
    const renderMessageContent = (content: MessageContent[]) => {
        if (!content || content.length === 0) {
            return null
        }

        return content.map((item, index) => {
            return (
                <div key={index}>
                    {allMessageContent[item.type as keyof typeof allMessageContent](item as any)}
                </div>
            )
        })
    }

    return (
        <Bubble.List
            ref={listRef}
            className="chat-bubble-list"
            style={{
                paddingInline: 16,
                height: '100%',
                width: '50vw',
                overflowY: 'auto', // 确保可以滚动但滚动条被CSS隐藏
                paddingBottom: '25%'
            }}
            roles={rolesAsObject}
            items={chatMessage?.map((message, index) => ({
                key: index,
                role: message.role,
                content: renderMessageContent(message.content)
            }))}
        />
    )
}
