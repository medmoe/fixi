import React, {useState} from 'react';
import {Link, useNavigate} from 'react-router-dom';
import {AuthLayout} from '../components/AuthLayout';
import {useRegisterMutation} from '../api/authApi';
import type {UserRole} from '../types';

export const RegisterPage = () => {
    const navigate = useNavigate();
    const [registerUser, {isLoading}] = useRegisterMutation();
    const [role, setRole] = useState<UserRole>('customer');
    const [formState, setFormState] = useState({
        name: '',
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
    });
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormState((prev) => ({...prev, [event.target.name]: event.target.value}));
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const pattern = /^[a-z0-9]+$/;
        const passwordPattern = /^(?=.*\d)(?=.*[A-Z]).{8,}$/;
        if (!pattern.test(formState.username)) {
            setError('Username can only contain lowercase letters and numbers');
            return;
        }
        if (formState.password !== formState.confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        if (!passwordPattern.test(formState.password)) {
            setError('Password must be at least 8 characters long and contain at least one number and one uppercase letter');
            return;
        }

        setError(null);
        setMessage(null);

        const payload = {
            name: formState.name,
            username: formState.username,
            email: formState.email,
            password: formState.password,
            role_type: role
        };
        try {
            await registerUser(payload).unwrap();
            // redirect to login page
            navigate('/login');
            setMessage('Account created. Please sign in.');
        } catch (err) {
            const apiError = err as { data?: { detail?: string } };
            setError(apiError.data?.detail ?? 'Registration failed. Double-check the details and try again.');
        }
    };

    return (
        <AuthLayout>
            <div className="space-y-6">
                <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-amber-300">Get started</p>
                    <h2 className="font-display text-2xl text-white">Create your Fixi account</h2>
                </div>

                <div className="flex gap-2 text-xs">
                    <button
                        type="button"
                        onClick={() => setRole('customer')}
                        className={`flex-1 rounded-full px-3 py-2 ${
                            role === 'customer' ? 'bg-amber-400 text-slate-900' : 'border border-slate-700 text-slate-300'
                        }`}
                    >
                        Customer
                    </button>
                    <button
                        type="button"
                        onClick={() => setRole('worker')}
                        className={`flex-1 rounded-full px-3 py-2 ${
                            role === 'worker' ? 'bg-amber-400 text-slate-900' : 'border border-slate-700 text-slate-300'
                        }`}
                    >
                        Worker
                    </button>
                </div>

                <form className="space-y-4" onSubmit={handleSubmit}>
                    <div className="grid gap-4 md:grid-cols-2">
                        <input
                            name="name"
                            placeholder="Full name"
                            value={formState.name}
                            onChange={handleChange}
                            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-white"
                            required
                        />
                        <input
                            name="username"
                            placeholder="Username"
                            value={formState.username}
                            onChange={handleChange}
                            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-white"
                            required
                        />
                    </div>
                    <input
                        name="email"
                        type="email"
                        placeholder="Email"
                        value={formState.email}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-white"
                        required
                    />
                    <input
                        name="password"
                        type="password"
                        placeholder="Password"
                        value={formState.password}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-white"
                        required
                    />
                    <input
                        name="confirmPassword"
                        type="password"
                        placeholder="Confirm Password"
                        value={formState.confirmPassword}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-white"
                        required
                    />

                    {error && <p className="text-sm text-rose-300">{error}</p>}
                    {message && <p className="text-sm text-emerald-300">{message}</p>}

                    <button
                        type="submit"
                        className="w-full rounded-full bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-amber-300"
                    >
                        {isLoading ? 'Creating...' : 'Create account'}
                    </button>
                </form>

                <div className="text-xs text-slate-400">
                    Already have an account?{' '}
                    <Link className="text-amber-300 underline" to="/login">
                        Sign in
                    </Link>
                </div>
            </div>
        </AuthLayout>
    );
};
