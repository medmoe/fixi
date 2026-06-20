import {useLogoutMutation} from '../api/authApi';
import {useDispatch} from 'react-redux';
import {useNavigate} from "react-router-dom";
import {clearCredentials} from "../authSlice";
import {apiSlice} from "@/app/apiSlice.ts";

export const useLogout = () => {
    const [logout, {isLoading}] = useLogoutMutation()
    const dispatch = useDispatch()
    const navigate = useNavigate()

    const handleLogout = async () => {
        try {
            await logout().unwrap()
        } finally {
            // Always clear state even if API call fails
            dispatch(clearCredentials())
            dispatch(apiSlice.util.resetApiState()) // clears RTK Query cache
            navigate('/login')
        }
    }
    return {handleLogout, isLoading}
}