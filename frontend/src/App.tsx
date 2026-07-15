import {BrowserRouter, Navigate, Route, Routes} from 'react-router-dom';
import {ToastHost} from './components/ToastHost';
import {LoginPage, RegisterPage} from '@/features/auth';
import {DashboardPage} from './features/dashboard/pages/DashboardPage';
import {ProfilePage} from './features/profile/pages/ProfilePage';
import {JobsPage} from './features/jobs/pages/JobsPage';
import {WorkersPage} from './features/workers/pages/WorkersPage';
import {JobDetailPage} from './features/jobs/pages/JobDetailPage';

const App = () => {
    return (
        <BrowserRouter future={{v7_startTransition: true, v7_relativeSplatPath: true}}>
            <Routes>
                <Route path="/" element={<></>}/>
                <Route path="/login" element={<LoginPage/>}/>
                <Route path="/register" element={<RegisterPage/>}/>
                <Route
                    path="/app"
                    element={
                        <DashboardPage/>
                    }
                />
                <Route
                    path="/profile"
                    element={
                        <ProfilePage/>
                    }
                />
                <Route
                    path="/jobs"
                    element={
                        <JobsPage/>
                    }
                />
                <Route
                    path="/jobs/:jobId"
                    element={
                        <JobDetailPage/>
                    }
                />
                <Route
                    path="/workers"
                    element={
                        <WorkersPage/>
                    }
                />
                <Route path="*" element={<Navigate to="/" replace/>}/>
            </Routes>
            <ToastHost/>
        </BrowserRouter>
    );
};

export default App;
