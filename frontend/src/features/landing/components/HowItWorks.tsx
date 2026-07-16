// src/features/landing/components/HowItWorks.tsx

import { UserPlus, Users, Star } from 'lucide-react'

const steps = [
    {
        icon: UserPlus,
        title: 'Join the Platform',
        description:
            'Register in minutes as a Customer looking for help or a Worker ready to offer your skills.',
        step: '01',
    },
    {
        icon: Users,
        title: 'Connect',
        description:
            'Browse local jobs or search for top-rated professionals near you. Filter by trade, radius, and availability.',
        step: '02',
    },
    {
        icon: Star,
        title: 'Complete & Review',
        description:
            'Coordinate securely through the platform, complete the job, and leave a verified review.',
        step: '03',
    },
]

export const HowItWorks = () => (
    <section
        aria-labelledby="how-it-works-heading"
        className="bg-muted/40 py-20"
    >
        <div className="container mx-auto px-4">
            <div className="text-center mb-12 space-y-3">
                <h2
                    id="how-it-works-heading"
                    className="text-3xl md:text-4xl font-bold"
                >
                    How Fixi Works
                </h2>
                <p className="text-muted-foreground max-w-xl mx-auto">
                    Three simple steps to get things done or grow your client base.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {steps.map(({ icon: Icon, title, description, step }) => (
                    <div
                        key={step}
                        className="relative bg-card border rounded-2xl p-6 shadow-sm flex flex-col gap-4"
                    >
                        <span
                            className="absolute top-4 right-4 text-5xl font-black text-primary/10 select-none"
                            aria-hidden="true"
                        >
                            {step}
                        </span>
                        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
                        </div>
                        <h3 className="text-lg font-semibold">{title}</h3>
                        <p className="text-sm text-muted-foreground">{description}</p>
                    </div>
                ))}
            </div>
        </div>
    </section>
)