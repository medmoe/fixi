// src/features/landing/pages/LandingPage.tsx

import { Navbar } from '../components/Navbar'
import { Hero } from '../components/Hero'
import { HowItWorks } from '../components/HowItWorks'
import { AudiencePitch } from '../components/AudiencePitch'
import { Footer } from '../components/Footer'

export const LandingPage = () => (
    <div className="min-h-screen flex flex-col">
        <Navbar />
        <main>
            <Hero />
            <HowItWorks />
            <AudiencePitch />
        </main>
        <Footer />
    </div>
)