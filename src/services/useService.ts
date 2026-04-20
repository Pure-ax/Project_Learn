import { authApi } from '@pc/apis/user'
import { useUserStore } from '@pc/store/useUserStore.ts'

import type { LoginParams, RegisterParams, CaptchaParams } from '@pc/types/user'

// 模拟数据模式
const USE_MOCK = false

export const userService = {
    async login(params: LoginParams) {
        try {
            useUserStore.getState().setLoading(true)
            useUserStore.getState().setError(null)

            if (USE_MOCK) {
                // 模拟登录成功
                await new Promise(resolve => setTimeout(resolve, 1000))
                useUserStore.setState({
                    isAuthenticated: true,
                    user: {
                        nickName: params.userName.split('@')[0]
                    },
                    token: 'mock-token-' + Date.now(),
                    loading: false,
                    error: null
                })
            } else {
                const response = await authApi.login(params)

                if (response.code === 1) {
                    useUserStore.setState({
                        isAuthenticated: true,
                        user: {
                            nickName: response.data.nickName
                        },
                        token: response.data.token,
                        loading: false,
                        error: null
                    })
                } else {
                    throw new Error(response.msg || '登录失败')
                }
            }
        } catch (error) {
            useUserStore.setState({
                loading: false,
                error: error instanceof Error ? error.message : '登录失败'
            })
            throw error
        }
    },

    async createAccount(params: RegisterParams) {
        try {
            useUserStore.getState().setLoading(true)
            useUserStore.getState().setError(null)

            if (USE_MOCK) {
                // 模拟注册成功
                await new Promise(resolve => setTimeout(resolve, 1000))
                // 注册成功后，自动登录
                await this.login({
                    userName: params.userName,
                    password: params.password
                })
            } else {
                const response = await authApi.register(params)

                if (response.code === 1) {
                    // 注册成功后，自动登录
                    await this.login({
                        userName: params.userName,
                        password: params.password
                    })
                } else {
                    throw new Error(response.msg || '注册失败')
                }
            }
        } catch (error) {
            useUserStore.setState({
                loading: false,
                error: error instanceof Error ? error.message : '注册失败'
            })
            throw error
        }
    },

    async sendCaptcha(params: CaptchaParams) {
        try {
            useUserStore.getState().setLoading(true)
            useUserStore.getState().setError(null)

            if (USE_MOCK) {
                // 模拟验证码发送成功
                await new Promise(resolve => setTimeout(resolve, 1000))
                useUserStore.getState().setLoading(false)
            } else {
                const response = await authApi.sendCaptcha(params)

                if (response.code !== 1) {
                    throw new Error(response.msg || '验证码发送失败')
                }

                useUserStore.getState().setLoading(false)
            }
        } catch (error) {
            useUserStore.setState({
                loading: false,
                error: error instanceof Error ? error.message : '验证码发送失败'
            })
            throw error
        }
    },

    logout() {
        useUserStore.setState({
            isAuthenticated: false,
            user: null,
            token: null,
            error: null
        })
    }
}
