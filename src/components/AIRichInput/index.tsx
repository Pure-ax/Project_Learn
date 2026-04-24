import { CoffeeOutlined, LinkOutlined, FireOutlined, SmileOutlined, CloseOutlined, OpenAIOutlined} from '@ant-design/icons'
import { Attachments, Prompts, Sender } from '@ant-design/x'
import { Button, message, Spin, Space, Typography, type GetRef } from 'antd'
import React from 'react'
import { useRef, useState } from 'react'
import SparkMD5 from 'spark-md5'
import type { PromptsProps } from '@ant-design/x'

import {
    createSSE,
    getCheckFileAPI,
    postFileChunksAPI,
    postMergeFileAPI,
    sendChatMessage
} from '@pc/apis/chat'
import { sessionApi } from '@pc/apis/session'
import { BASE_URL, DEFAULT_MESSAGE } from '@pc/constant'
import { useChatStore, useConversationStore } from '@pc/store'
import { isImageByExtension } from '@pc/utils/judgeImage'

import type { RcFile } from 'antd/es/upload'

// 切片的大小 - 使用2MB分片大小以提高上传效率
const CHUNK_SIZE = 1024 * 1024 * 2
// 并发上传数量
const CONCURRENT_UPLOADS = 3
// 切片接口类型定义
interface ChunkInfo {
    index: number
    chunk: Blob
}

const AIRichInput = () => {
    // 加载状态处理
    const [isLoading, setIsLoading] = useState(false)
    // 输入加载状态
    const [inputLoading, setInputLoading] = useState(false)
    // 附件面板开关状态
    const [open, setOpen] = useState(false)
    // 输入框内容有无状态
    const [hasInput, setHasInput] = useState(false)
    // 输入框内容状态
    const [inputValue, setInputValue] = useState('')
    // 附件组件Ref
    const attachmentsRef = useRef<GetRef<typeof Attachments>>(null)
    // 输入框组件Ref
    const senderRef = useRef<GetRef<typeof Sender>>(null)
    // 取消上传控制器
    const abortControllerRef = useRef<AbortController | null>(null)
    // 新建对话ID
    const idRef = useRef<string | null>(null)
    // SSE连接
    const eventSourceRef = useRef<EventSource | null>(null)
    // 已上传的切片索引数组
    const uploadedChunksRef = useRef<number[]>([])
    // 整个文件的所有切片数组
    const fileChunksRef = useRef<ChunkInfo[]>([])
    // 文件ID，MD5加密计算的唯一值
    const fileIdRef = useRef<string | null>(null)
    // 文件名
    const fileNameRef = useRef<string | null>(null)
    // 文件上传路径
    const filePathRef = useRef<string | null>(null)
    // 推荐问题显示状态
    const [showPrompts, setShowPrompts] = useState(true)
    // 全部消息、添加消息、添加流式消息
    const { messages, addMessage, addChunkMessage } = useChatStore()
    // 当前选中对话ID、设置当前对话、添加新对话
    const { selectedId, setSelectedId, addConversation } = useConversationStore()

    // 监听输入值变化
    const handleInputChange = (value: string) => {
        setInputValue(value)
        setHasInput(!!value.trim())
    }

    // 创建文件分片
    const createFileChunks = (file: File): ChunkInfo[] => {
        // 切片数组
        const chunks: ChunkInfo[] = []
        // 切片数量
        const chunksCount = Math.ceil(file.size / CHUNK_SIZE)

        // 通过循环把文件切片
        for (let i = 0; i < chunksCount; i++) {
            const start = i * CHUNK_SIZE
            const end = Math.min(file.size, start + CHUNK_SIZE)
            const chunk = file.slice(start, end)
            chunks.push({
                index: i,
                chunk: chunk
            })
        }
        // 返回切片完成的数组
        return chunks
    }

    // 计算单个分片的hash
    const calculateChunkHash = async (chunk: Blob): Promise<string> => {
        return new Promise((resolve, reject) => {
            // 创建SparkMD5实例，用来计算MD5
            const spark = new SparkMD5.ArrayBuffer()
            // 创建文件读取实例
            const reader = new FileReader()
            // 读取文件作为ArrayBuffer格式，便于MD5辨认
            reader.readAsArrayBuffer(chunk)
            // 读取后的处理
            reader.onload = (e) => {
                if (e.target?.result) {
                    // MD5进行处理
                    spark.append(e.target.result as ArrayBuffer)
                    resolve(spark.end())
                } else {
                    reject(new Error('Failed to read chunk'))
                }
            }
            reader.onerror = () => reject(new Error('Error reading chunk'))
        })
    }

    // 计算整个文件hash（用于文件唯一标识）
    const calculateFileHash = async (fileChunks: ChunkInfo[]): Promise<string> => {
        return new Promise((resolve, reject) => {
            const spark = new SparkMD5.ArrayBuffer()
            // 创建二进制数组，存储参与计算的片段
            const chunks: Blob[] = []

            fileChunks.forEach((chunk, index) => {
                if (index === 0 || index === fileChunks.length - 1) {
                    // 第一个和最后一个切片的内容全部参与计算
                    chunks.push(chunk.chunk)
                } else {
                    // 中间剩余的切片分别在前面、后面和中间取2个字节参与计算
                    chunks.push(chunk.chunk.slice(0, 2))
                    chunks.push(chunk.chunk.slice(CHUNK_SIZE / 2, CHUNK_SIZE / 2 + 2))
                    chunks.push(chunk.chunk.slice(CHUNK_SIZE - 2, CHUNK_SIZE))
                }
            })
            // 创建文件读取实例
            const reader = new FileReader()
            // 将参与计算的片段拼接为新的Blob对象，读取计算MD5
            reader.readAsArrayBuffer(new Blob(chunks))
            // 读取后处理
            reader.onload = (e) => {
                if (e.target?.result) {
                    spark.append(e.target.result as ArrayBuffer)
                    resolve(spark.end())
                } else {
                    reject(new Error('Failed to read chunk'))
                }
            }
            reader.onerror = () => reject(new Error('Error reading file hash'))
        })
    }

    // 上传单个分片
    const uploadSingleChunk = async (
        chunk: ChunkInfo,
        fileId: string,
        fileName: string,
        controller: AbortController
    ): Promise<boolean> => {
        // 通过已上传切片的Ref.current值定位还未上传的切片
        if (uploadedChunksRef.current.includes(chunk.index)) {
            console.log(`分片 ${chunk.index} 已上传，跳过`)
            return true
        }

        try {
            // 计算单个切片
            const chunkHash = await calculateChunkHash(chunk.chunk)
            // 创建表单实例
            const formData = new FormData()
            // 表单数据添加
            formData.append('fileId', fileId)
            formData.append('fileName', fileName)
            formData.append('index', String(chunk.index))
            formData.append('chunkHash', chunkHash)
            formData.append('chunk', chunk.chunk)

            // 接口请求，传递数据给后端
            const response = await postFileChunksAPI(formData, controller.signal)

            // 如果传递成功则继续下一个切片
            if (response) {
                uploadedChunksRef.current.push(chunk.index)
                return true
            } else {
                return false
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            if (error.name === 'AbortError') {
                return false
            }
            return false
        }
    }

    // 并发上传分片
    const uploadChunksWithConcurrency = async (
        // 参数：
        // - fileChunks：所有切片数组
        // - fileId：文件 ID
        // - fileName：文件名
        // - uploaded：已上传的切片索引数组（后端返回的）
        // - controller：取消控制器
        // 返回：true 所有切片都传完了，false 没传完
        fileChunks: ChunkInfo[],
        fileId: string,
        fileName: string,
        uploaded: number[],
        controller: AbortController
    ): Promise<boolean> => {
        // 1. 初始化：把后端返回的“已上传索引”存到 Ref 里
        uploadedChunksRef.current = uploaded
        fileChunksRef.current = fileChunks

        // 2. 过滤出“还没上传的切片”
        const pendingChunks = fileChunks.filter(
            (chunk) => !uploadedChunksRef.current.includes(chunk.index)
        )

        // 3. 如果所有切片都传完了，直接返回 true
        if (pendingChunks.length === 0) {
            return true
        }

        console.log(`开始上传 ${pendingChunks.length} 个分片，并发数: ${CONCURRENT_UPLOADS}`)

        // 使用并发控制上传
        // 待上传队列（复制一份，避免修改原数组）
        const chunksToUpload = [...pendingChunks]
        // 存所有上传任务的 Promise
        const uploadPromises: Promise<void>[] = []

        // 不断从队列里取切片上传
        const uploadNext = async (): Promise<void> => {
            // 只要队列里还有切片，就一直传
            while (chunksToUpload.length > 0) {
                // 从队列头部取一个切片（shift：取出并删除第一个元素）
                const chunk = chunksToUpload.shift()
                if (!chunk) break
                // 调用上传单个切片方法，上传这个切片
                await uploadSingleChunk(chunk, fileId, fileName, controller)
            }
        }

        // 启动并发上传
        const concurrentUploads = Math.min(CONCURRENT_UPLOADS, chunksToUpload.length)
        for (let i = 0; i < concurrentUploads; i++) {
            uploadPromises.push(uploadNext())
        }

        // 等待所有并发结束
        await Promise.all(uploadPromises)

        // 检查是否所有分片都已上传
        const allUploaded = fileChunks.every((chunk) => uploadedChunksRef.current.includes(chunk.index))
        return allUploaded
    }
    // 用户选取的文件
    const selectFile = async (file: RcFile) => {
        try {
            // 修改加载状态，启动加载动画
            setIsLoading(true)

            // 新建取消控制器
            const controller = new AbortController()
            abortControllerRef.current = controller
            const fileName = file.name
            fileNameRef.current = fileName

            // 创建切片
            const fileChunks = createFileChunks(file)

            // 计算整个文件的hash作为fileId
            const fileId = await calculateFileHash(fileChunks)
            fileIdRef.current = fileId

            // 分片上传前的校验(向后端确认是否传递过)
            const {
                data: { fileStatus, uploaded, filePath }
            } = await getCheckFileAPI(fileId, file.name, selectedId ? selectedId : '')

            if (fileStatus === 1) {
                message.success('文件上传成功')
                filePathRef.current = filePath || ''
                return
            } else {
                // 上传分片
                const success = await uploadChunksWithConcurrency(
                    fileChunks,
                    fileId,
                    fileName,
                    uploaded || [],
                    controller
                )

                if (success) {
                    // 合并文件
                    const {
                        data: { fileName: mergedFileName, filePath }
                    } = await postMergeFileAPI({
                        fileId,
                        fileName: fileName,
                        totalChunks: fileChunks.length
                    })

                    console.log('文件合并成功:', mergedFileName, filePath)

                    filePathRef.current = filePath
                    message.success('文件上传完成！')
                } else {
                    message.error('部分分片上传失败，请重试')
                }
            }
        } catch (error: unknown) {
            console.log('上传过程出错:', error)
            message.error('文件上传失败')
        } finally {
            setIsLoading(false)
            uploadedChunksRef.current = []
            fileChunksRef.current = []
        }
    }

    // 粘贴上传/文件框选择上传都会拦截至此处
    const handleFileUpload = (file: RcFile) => {
        selectFile(file)
        return false
    }

    // 取消文件上传
    const cancleUpload = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort() // 取消所有分片请求
            abortControllerRef.current = null
        }
        setIsLoading(false)
        uploadedChunksRef.current = []
        fileChunksRef.current = []
        message.info('文件上传已取消')
    }

    // 参数：
    // - chatId：会话 ID
    // - message：用户输入的文字
    // - fileId：上传的文件 ID
    const sendMessage = async (
        chatId: string,
        message: string,
        fileId?: string
    ) => {
        await sendChatMessage({
            id: chatId,
            message,
            fileId
        })
    }

    // 建立SSE连接，流式接收回复
    const createSSEAndSendMessage = (
        chatId: string,
        message: string,
        fileId?: string
    ) => {
        // 1.关闭旧的SSE连接，防止重复连接
        if (eventSourceRef.current) {
            eventSourceRef.current.close()
        }

        // 2.建立新的SSE连接
        eventSourceRef.current = createSSE(chatId)
        // 临时存储的AI回复
        let content = ''
        // 3.监听SSE消息
        eventSourceRef.current.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data)
                if (data.type === 'chunk') {
                    content += data.content
                    addChunkMessage(data.content)
                } else if (data.type === 'complete') {
                    content = data.content
                    setInputLoading(false)
                    content = ''
                } else if (data.type === 'error') {
                    console.error('SSE连接错误:', data.error)
                }
            } catch (error) {
                console.log('解析消息失败', error)
            }
        }
        // 4.监听SSE连接错误
        eventSourceRef.current.onerror = (error) => {
            console.error('SSE连接错误:', error)
            eventSourceRef.current?.close()
            eventSourceRef.current = null
        }

        // 发送用户消息(先建立SSE再发送消息)
        sendMessage(chatId, message, fileId)
    }

    // 提交消息
    const submitMessage = async (message: string) => {
        setInputLoading(true)
        // 新建会话，并将id与会话关联
        if (!selectedId) {
            const { data } = await sessionApi.createChat(message || '图片消息')
            const { id, title } = data
            idRef.current = id
            setSelectedId(id)
            addConversation({ id, title })
        }

        // 添加文件内容
        if (fileIdRef.current) {
            const fileIsImage = isImageByExtension(fileNameRef.current!)
            console.log(`${BASE_URL}${fileNameRef.current}`, 'xxxxxxxx')
            if (fileIsImage) {
                addMessage({
                    content: [
                        {
                            type: 'image',
                            content: filePathRef.current!
                        }
                    ],
                    role: 'image'
                })
            } else {
                addMessage({
                    content: [
                        {
                            type: 'file',
                            content: {
                                uid: fileIdRef.current,
                                name: fileNameRef.current!
                            }
                        }
                    ],
                    role: 'file'
                })
            }
        }

        if (message)
            if (message.trim()) {
                // 添加文本内容
                addMessage({
                    content: [
                        {
                            type: 'text',
                            content: message
                        }
                    ],
                    role: 'user'
                })
            }

        if (idRef.current || selectedId) {
            // 建立sse连接，发送消息请求,并展示模型回复
            createSSEAndSendMessage(
                idRef.current || (selectedId as string),
                message,
                // selectedImages.length > 0 ? selectedImages : undefined,
                fileIdRef.current ? fileIdRef.current : undefined
            )
        }

        // 重置输入状态和清空输入框
        setHasInput(false)
        setInputValue('')
    }

    const senderHeader = (
        <Sender.Header
            title="Attachments"
            styles={{
                content: {
                    padding: 0
                }
            }}
            open={open}
            onOpenChange={setOpen}
            forceRender>
            <Spin
                spinning={isLoading}
                tip={
                    <span
                        style={{
                            fontSize: '12px',
                            color: '#ff4f39',
                            cursor: 'pointer'
                        }}
                        onClick={cancleUpload}>
            点击取消
          </span>
                }>
                <Attachments
                    ref={attachmentsRef}
                    styles={{
                        placeholder: { backgroundColor: 'transparent' }
                    }}
                    beforeUpload={handleFileUpload}
                    placeholder={(type) =>
                        type === 'drop'
                            ? {
                                title: '请将文件拖拽至此处'
                            }
                            : {
                                title: '文件上传',
                                description: '点击或拖拽上传文件'
                            }
                    }
                    getDropContainer={() => senderRef.current?.nativeElement}
                />
            </Spin>
        </Sender.Header>
    )

    const showDefaultMessage = () => {
        if (!selectedId) {
            return <div className="text-2xl font-bold mb-10 text-center">{DEFAULT_MESSAGE}</div>
        }

        const chatInfo = messages.get(selectedId)

        if (chatInfo?.length !== 0) {
            return null
        }
    }

    const items: PromptsProps['items'] = [
        {
            key: '1',
            icon: <CoffeeOutlined style={{ color: '#964B00' }} />,
            description: 'How to rest effectively after long hours of work?',
            disabled: false,
        },
        {
            key: '2',
            icon: <SmileOutlined style={{ color: '#FAAD14' }} />,
            description: 'What are the secrets to maintaining a positive mindset?',
            disabled: false,
        },
        {
            key: '3',
            icon: <FireOutlined style={{ color: '#FF4D4F' }} />,
            description: 'How to stay calm under immense pressure?',
            disabled: false,
        },
    ];

    // 处理提示建议点击
    const handlePromptClick = (info: { data: any }):void => {
        console.log('点击了提示建议:', info.data)
        setInputValue(info.data.description)
        setHasInput(true)
    }
    // 处理语音输入
    // const handleVoiceInput = (voice: { data: any}):void => {
    //     console.log('语音输入', voice)
    // }

    return (
        <React.Fragment>
            <div
                className={`fixed w-1/2 z-50 ${!selectedId ? 'bottom-1/3' : 'bottom-0'} pb-[30px] bg-white`}>
                {showDefaultMessage()}
                {!inputLoading && !hasInput && showPrompts && (
                    <div className="flex justify-between">
                        <Prompts
                            className="mb-4 mt-4"
                            title="🤔 You might also want to ask:"
                            items={items}
                            vertical
                            onItemClick={handlePromptClick}
                        />

                        {/* 关闭Prompts */}
                        <div className="mt-2">
                            <Button type="text" icon={<CloseOutlined />} onClick={() => setShowPrompts(false)} />
                        </div>
                    </div>)}

                <Sender
                    ref={senderRef}
                    value={inputValue}
                    onChange={handleInputChange}
                    header={senderHeader}
                    prefix={<Button type="text" icon={<LinkOutlined />} onClick={() => setOpen(!open)} />}
                    suffix={(_, info) => {
                        const { SendButton, LoadingButton, ClearButton, SpeechButton } = info.components;
                        return (
                            <Space size="small">
                                <Typography.Text style={{ whiteSpace: 'nowrap' }} type="secondary">
                                    <small>`Shift + Enter` to submit</small>
                                </Typography.Text>
                                <ClearButton />
                                <SpeechButton />
                                {inputLoading ? (
                                    <LoadingButton
                                        type="default"
                                        variant="filled"
                                        icon={
                                            <Spin
                                                style={{
                                                    display: 'flex',
                                                }}
                                                styles={{
                                                    indicator: {
                                                        color: '#fff',
                                                    },
                                                }}
                                                size="small"
                                            />
                                        }
                                        disabled
                                    />
                                ) : (
                                    <SendButton
                                        type="primary"
                                        icon={<OpenAIOutlined />}
                                        disabled={false}
                                    />
                                )}
                            </Space>
                        );
                    }}
                    onPasteFile={(files) => {
                        for (const file of files) {
                            // 生成base64临时图片路径
                            attachmentsRef.current?.upload(file)
                        }
                        setOpen(true)
                    }}
                    submitType="shiftEnter"
                    placeholder="请输入您的问题"
                    loading={inputLoading}
                    onSubmit={(message) => submitMessage(message)}
                    allowClear
                />
            </div>
        </React.Fragment>
    )
}

export default AIRichInput
