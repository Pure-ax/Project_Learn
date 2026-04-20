import { useState} from "react";
import type{ RegisterParams,CaptchaParams } from "@pc/types/user.ts";

interface RegisterFormProps {
    onSubmit: (params: RegisterParams) => void
    onSendCaptcha: (params: CaptchaParams) => void
    buttonText?: string
    loading?: boolean
}

export default function RegisterForm(props:RegisterFormProps) {
    const onSubmit = props.onSubmit
    const onSendCaptcha = props.onSendCaptcha
    const buttonText = props.buttonText ?? "注册"
    const [countDown, setCountDown] = useState(0);
    const [captchaSend, setCaptchaSend] = useState(false);
    const [address, setAddress] = useState<string>("");
    const [error,setError] = useState<string|null>(null)
    function handleSubmit(e:React.FormEvent<HTMLFormElement>){
        e.preventDefault()
        const formData = new FormData(e.target as HTMLFormElement)
        const userName = formData.get('userName') as string
        const password = formData.get('password') as string
        const nickName = formData.get('nickName') as string
        const captcha = formData.get('captcha') as string

        // 表单验证
        if(password.length < 6 || password.length > 20){
            setError('密码长度必须在6-20个字符之间')
            return
        }
        if(nickName.length < 2 || nickName.length > 20){
            setError('昵称长度必须在2-20个字符之间')
            return
        }
        onSubmit({userName,password,nickName,captcha})
    }
    const handleSendCaptcha = async()=>{
        setError(null)
        if(!address){
            setError('请输入邮箱地址')
            return
        }
        if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)){
            setError('请输入有效的邮箱地址')
            return
        }
        try{
            onSendCaptcha({address})
            setCaptchaSend(true)
            let seconds = 60
            setCountDown(seconds)
            const timer = setInterval(()=>{
                seconds-=1
                setCountDown(seconds)
                if(seconds < 1){
                    clearInterval(timer)
                    setCaptchaSend(false)
                }
            },1000)
        }catch (error){
            console.log('发送验证码失败',error)
            setError('验证码发送失败，请稍后重试')
        }
    }
    return(
        <form onSubmit={handleSubmit} className={"space-y-4"}>
            {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
                    {error}
                </div>
            )}

            <div>
                <input
                    type={'email'}
                    name={'userName'}
                    required={true}
                    disabled={false}
                    placeholder={'邮箱'}
                    onChange={(e)=>setAddress(e.target.value)}
                    className="w-full px-4 py-3 border rounded-md border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
            </div>

            <div>
                <input
                    type={'password'}
                    name={'password'}
                    required={true}
                    disabled={false}
                    placeholder={'密码(6-20个字符)'}
                    minLength={6}
                    maxLength={20}
                    className="w-full px-4 py-3 border rounded-md border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
            </div>

            <div>
                <input
                    type={'text'}
                    name={'nickName'}
                    required={true}
                    disabled={false}
                    placeholder={'昵称(2-20个字符)'}
                    minLength={2}
                    maxLength={20}
                    className="w-full px-4 py-3 border rounded-md border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
            </div>

            <div className={'flex gap-2'}>
                <input
                    type={'text'}
                    name={'captcha'}
                    required={true}
                    disabled={false}
                    placeholder={'验证码'}
                    className="w-full px-4 py-3 border rounded-md border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                <button
                    type={'submit'}
                    onClick={handleSendCaptcha}
                    disabled={captchaSend}
                    className="text-xs px-4 py-2 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                    {captchaSend ? `重新发送(${countDown}s)` : '发送验证码'}
                </button>
            </div>

            <button
                type={'submit'}
                disabled={false}
                className={"w-full py-3 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 transition disabled:bg-emerald-300 disabled:cursor-not-allowed"}
            >
                {buttonText}
            </button>
        </form>
    )
}
