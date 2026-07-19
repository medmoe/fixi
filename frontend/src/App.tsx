import {BrowserRouter, Navigate, Route, Routes} from 'react-router-dom';
import {LoginPage, RegisterPage} from '@/features/auth';
import {LandingPage} from '@/features/landing';
import {WorkerDashboardPage} from '@/features/worker/pages/WorkerDashboardPage';
import {ProtectedRoute} from '@/components/ProtectedRoute';

const App = () => {
    return (
        <BrowserRouter future={{v7_startTransition: true, v7_relativeSplatPath: true}}>
            <Routes>
                {/* public routes*/}
                <Route path="/" element={<LandingPage/>}/>
                <Route path="/login" element={<LoginPage/>}/>
                <Route path="/register" element={<RegisterPage/>}/>

                {/* Worker-only routes */}
                <Route path="/dashboard" element={
                    <ProtectedRoute allowedRoles={['worker']}>
                        <WorkerDashboardPage/>
                    </ProtectedRoute>
                }/>
                <Route path="*" element={<Navigate to="/" replace/>}/>
            </Routes>
        </BrowserRouter>
    );
};

export default App;
