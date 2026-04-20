// import axios,{type AxiosError,type Method} from "axios";
// import {BASE_URL} from "@pc/constant";
// import {useUserStore} from "@pc/store/useUserStore.ts";
// import {message} from "antd";
// import router from "@pc/router"
// // 请求实例
// const instance = axios.create({
//     base:BASE_URL,
//     timeout:30000
// })
// // 免token鉴权白名单，防止登录/注册死循环
// const WhiteList = ['/users/login', '/users/register', '/users/register-captcha']
// // 请求拦截器
// instance.interceptors.request.use(
//     (config)=>{
//         // 检查是否在白名单内
//         const isWhiteLi = WhiteList.some(item=>config.url?.includes(item))
//         // 如果在白名单，不需要token验证
//         if(isWhiteLi){
//             return config
//         }
//         const {token} = useUserStore.getState()
//         // 添加token至请求头
//         config.headers.Authorization = 'Bearer ' + token
//         return config
//     }
// )
// // 响应拦截器
// instance.interceptors.response.use(
//     (response)=>{
//         // 请求状态码!=业务状态码
//         const {code,msg} = response.data
//         console.log('响应拦截器', code, msg)
//         // 业务统一码出错
//         if(code===400||code===401||code===404){
//             message.error(msg||'请求出错')
//             return router.navigate('/login')
//         }
//         console.log('响应拦截器', response.data)
//         return response.data
//     },
//     (error:AxiosError)=>{
//         const {status} = error
//         if(status===401){
//             message.warning('登陆状态有误，请重新登录')
//             router.navigate('/login',{
//                 replace:true
//             })
//         }else if(error.message === 'Network Error'){
//             message.error('网络错误，无法连接到服务器，请稍后再试')
//         }else{
//             // 其他状态码出错
//             message.error(`请求出错: ${status || error.message}`)
//         }
//         return Promise.reject(error)
//     }
// )
//
// export type Data<T> = {
//     data: T,
//     code: number | string,
//     msg: string | null
// }
// /**
//  * @param url 接口地址
//  * @param method 请求方法(默认为GET)
//  * @param submitData 请求数据(可选)
//  * @returns
//  */
// export const request = <T>(
//     url: string,
//     method: Method = 'GET',
//     submitData?: object,
//     options?: { signal?:AbortSignal }
// ) => {
//     return instance.request<any,Data<T>>({
//         url,
//         method,
//         [method.toUpperCase()==='GET'?'params':'data']: submitData,
//         signal: options?.signal
//     })
// }
//
//
import axios, {type AxiosError, type Method} from "axios";
import {BASE_URL} from "@pc/constant";
import {useUserStore} from "@pc/store/useUserStore.ts";
import router from "@pc/router";
import {message} from "antd";

const instance = axios.create({
    baseURL: BASE_URL,
    timeout: 30000
})
//  添加token鉴权白名单，防止登录注册界面一直死循环跳转
const WhiteList = ['/users/login','/users/register','/users/register-captcha']

// 添加请求拦截器
instance.interceptors.request.use(
    (config)=>{
        // 检查是否在白名单内
        const isWhite = WhiteList.some(item=>config.url?.includes(item))
        if(isWhite){
            return config
        }else{
            // 获取token
            const token = useUserStore.getState().token
            // 如果有token则下一步，没有就跳转到login界面
            if(token){
                // 将token添加至请求头
                config.headers.Authorization = 'Bearer' + token
                return config
            }else{
                router.navigate('./login',{replace:true})
            }
        }
    }
)
// 添加响应拦截器
instance.interceptors.response.use(
    // 处理响应错误
    (response)=>{
        // 获取状态码和状态信息
        const {code,msg} = response.data
        console.log('响应拦截器:',code,msg)
        if([400,401,404].includes(code)){
            message.error(msg || '请求出错')
            return router.navigate('/login')
        }
        console.log('响应拦截器:',response.data)
        return response.data
    },
    (error:AxiosError)=>{
        // 解构获取error的status
        const {status} = error
        if(status === 401){
            console.log('登陆状态有误，请重新登录...')
            router.navigate('./login',{
                replace:true
            })
        }else if(status === 'Network Error'){
            message.error(status)
        }else{
            message.error(status)
        }
        return Promise.reject(error)
    }
)

export type Data<T> = {
    data: T
    code: string | number
    msg: string | null
}
export const request = <T>(
    url: string,
    method: Method = 'GET',
    submitData?: object,
    options?: { signal?:AbortSignal }
) => {
    return instance.request<any,Data<T>>({
        url,
        method,
        [method.toUpperCase()==='GET'?'params':'data']: submitData,
        signal: options?.signal
    })
}
