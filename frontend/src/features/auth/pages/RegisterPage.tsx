import {useState} from 'react';
import {Link, useNavigate} from 'react-router-dom';
import {AuthLayout} from '../components/AuthLayout';
import {useRegisterMutation} from '../api/authApi';
import type {RegisterCustomer, RegisterHandyman, UserRole} from '../types';

const defaultAvailability = {
    weekday: '9-5'
};

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
        saved_addresses: '',
        skill_category: '',
        skills: '',
        certification_urls: '',
        hourly_rate: ''
    });
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setFormState((prev) => ({...prev, [event.target.name]: event.target.value}));
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const pattern = /^[a-z0-9]+$/;
        if (!pattern.test(formState.username)) {
            setError('Username can only contain lowercase letters and numbers');
            return;
        }
        if (formState.password !== formState.confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        if (formState.password.length < 8) {
            setError('Password must be at least 8 characters long');
            return;
        }

        setError(null);
        setMessage(null);

        const basePayload = {
            name: formState.name,
            username: formState.username,
            email: formState.email,
            password: formState.password,
            role
        };

        const payload: RegisterCustomer | RegisterHandyman =
            role === 'customer'
                ? {
                    ...basePayload,
                    role: 'customer',
                    saved_addresses: formState.saved_addresses
                        ? formState.saved_addresses.split(',').map((item) => item.trim()).filter(Boolean)
                        : []
                }
                : {
                    ...basePayload,
                    role: 'handyman',
                    skill_category: formState.skill_category,
                    skills: formState.skills.split(',').map((item) => item.trim()).filter(Boolean),
                    certification_urls: formState.certification_urls
                        ? formState.certification_urls.split(',').map((item) => item.trim()).filter(Boolean)
                        : [],
                    hourly_rate: Number(formState.hourly_rate || 0),
                    availability: defaultAvailability
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
                        onClick={() => setRole('handyman')}
                        className={`flex-1 rounded-full px-3 py-2 ${
                            role === 'handyman' ? 'bg-amber-400 text-slate-900' : 'border border-slate-700 text-slate-300'
                        }`}
                    >
                        Handyman
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

                    {role === 'customer' ? (
                        <>
                            <input
                                name="saved_addresses"
                                placeholder="Saved addresses (comma separated)"
                                value={formState.saved_addresses}
                                onChange={handleChange}
                                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-white"
                            />
                        </>
                    ) : (
                        <>
                            <input
                                name="skill_category"
                                placeholder="Skill category"
                                value={formState.skill_category}
                                onChange={handleChange}
                                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-white"
                                required
                            />
                            <input
                                name="skills"
                                placeholder="Skills (comma separated)"
                                value={formState.skills}
                                onChange={handleChange}
                                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-white"
                                required
                            />
                            <input
                                name="certification_urls"
                                placeholder="Certification URLs (comma separated)"
                                value={formState.certification_urls}
                                onChange={handleChange}
                                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-white"
                            />
                            <input
                                name="hourly_rate"
                                placeholder="Hourly rate"
                                value={formState.hourly_rate}
                                onChange={handleChange}
                                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-white"
                                required
                            />
                        </>
                    )}

                    {error && <p className="text-sm text-rose-300">{error}</p>}
                    {message && <p className="text-sm text-emerald-300">{message}</p>}

                    <button
                        type="submit"
                        disabled={isLoading}
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
