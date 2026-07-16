// src/features/landing/components/Footer.tsx

import { Link } from 'react-router-dom'
import { Zap } from 'lucide-react'

export const Footer = () => (
    <footer className="border-t bg-muted/40 py-12">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <Link
                to="/"
                className="flex items-center gap-2 font-bold text-lg text-primary"
                aria-label="Fixi home"
            >
                <Zap className="h-5 w-5" aria-hidden="true" />
                Fixi
            </Link>
            <p className="text-xs text-muted-foreground">
                © {new Date().getFullYear()} Fixi. All rights reserved.
            </p>
            <nav aria-label="Footer navigation" className="flex gap-4">
                <Link
                    to="/login"
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                    Log In
                </Link>
                <Link
                    to="/register"
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                    Sign Up
                </Link>
            </nav>
        </div>
    </footer>
)