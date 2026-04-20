import {Link} from 'react-router-dom'

interface AuthLinkProps {
    isLogin: boolean
}
export default function AuthLink({isLogin}:AuthLinkProps){
    return(
        <div className="text-center">
            {isLogin?(
                <>
                    <Link to="/create-account" className="text-emerald-500 hover:underline ml-1">
                        注册
                    </Link>
                </>
            ):(
             <>
                 <Link to="/login" className="text-emerald-500 hover:underline ml-1">
                     登录
                 </Link>
             </>
            )
            }
        </div>
    )
}