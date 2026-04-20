import {request} from "@pc/utils/request.ts";

// 导入Data类型和参数类型
import type {LoginParams,RegisterParams,CaptchaParams,UserInfo} from "@pc/types/user.ts";
import type {Data} from "@pc/utils/request.ts";

//认证相关接口
export const authApi = {
    // 登录
    login: (params: LoginParams): Promise<Data<UserInfo>> => {
        return request('/users/login','POST',params)
    },
    // 注册
    register: (params: RegisterParams): Promise<Data<object>> => {
        return request('/users/register','POST',params)
    },
    // 发送验证码
    sendCaptcha: (params: CaptchaParams): Promise<Data<object>> => {
        return request('/users/register-captcha','GET',params)
    }
}