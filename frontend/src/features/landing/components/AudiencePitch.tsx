// src/features/landing/components/AudiencePitch.tsx

import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'

const customerBenefits = [
    'Verified and vetted professionals only',
    'Secure booking and payment protection',
    'Real reviews from real customers',
    'Service radius filtering — find pros near you',
    'Instant availability status on every profile',
]

const workerBenefits = [
    'Set your own rates and availability',
    'Low platform fees — keep more of your earnings',
    'Build a verified review portfolio',
    'Access a growing local client base',
    'Get paid quickly and securely',
]

const BenefitList = ({ items }: { items: string[] }) => (
    <ul className="space-y-3" role="list">
        {items.map((item) => (
            <li key={item} className="flex items-start gap-3">
                <span className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="h-3 w-3 text-primary" aria-hidden="true" />
                </span>
                <span className="text-sm text-muted-foreground">{item}</span>
            </li>
        ))}
    </ul>
)

export const AudiencePitch = () => (
    <section
        aria-labelledby="audience-heading"
        className="container mx-auto px-4 py-20"
    >
        <div className="text-center mb-12 space-y-3">
            <h2
                id="audience-heading"
                className="text-3xl md:text-4xl font-bold"
            >
                Built for Everyone
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
                Whether you need a job done or want to grow your trade business,
                Fixi has you covered.
            </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* For Customers */}
            <div className="bg-card border rounded-2xl p-8 shadow-sm space-y-6">
                <div className="space-y-2">
                    <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                        For Customers
                    </span>
                    <h3 className="text-2xl font-bold">Get the job done right</h3>
                    <p className="text-sm text-muted-foreground">
                        Find skilled, verified professionals in your area quickly and securely.
                    </p>
                </div>
                <BenefitList items={customerBenefits} />
                <Button className="w-full min-h-[44px]" asChild>
                    <Link to="/register?role=customer">
                        Find a Professional
                    </Link>
                </Button>
            </div>

            {/* For Workers */}
            <div className="bg-card border rounded-2xl p-8 shadow-sm space-y-6">
                <div className="space-y-2">
                    <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                        For Workers
                    </span>
                    <h3 className="text-2xl font-bold">Grow your trade business</h3>
                    <p className="text-sm text-muted-foreground">
                        Reach more clients, manage your schedule, and get paid on your terms.
                    </p>
                </div>
                <BenefitList items={workerBenefits} />
                <Button variant="outline" className="w-full min-h-[44px]" asChild>
                    <Link to="/register?role=worker">
                        Offer My Services
                    </Link>
                </Button>
            </div>
        </div>
    </section>
)