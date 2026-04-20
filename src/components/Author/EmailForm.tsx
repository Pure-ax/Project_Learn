import type {LoginParams} from "@pc/types/user.ts";
interface EmailFormProps{
    onSubmit:(params:LoginParams) => void;
    BtnText?: string;
    usernamePlaceholder?: string;
    passwordPlaceholder?: string;
}

export default function EmailForm({
    onSubmit,
    BtnText = '登录',
}: EmailFormProps){
    const handleSubmit = (e)=>{
        e.preventDefault()
        const formData = new FormData(e.target as HTMLFormElement)
        const userName = formData.get('userName') as string
        const password = formData.get('password') as string
        onSubmit({userName, password})
    }
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <input
                    type={"text"}
                    name={"userName"}
                    placeholder="请输入你的用户名"
                    required={true}
                    disabled={false}
                    className="w-full px-4 py-3 border rounded-md border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
            </div>
            <div>
                <input
                    type={"password"}
                    name={"password"}
                    placeholder="请输入你的密码"
                    required={true}
                    disabled={false}
                    className="w-full px-4 py-3 border rounded-md border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
            </div>
            <div>
                <button
                    type={"submit"}
                    disabled={false}
                    className="w-full py-3 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 transition disabled:bg-emerald-300 disabled:cursor-not-allowed"
                >{ BtnText }</button>
            </div>
        </form>
    )
}
