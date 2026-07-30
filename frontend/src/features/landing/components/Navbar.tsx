// src/features/landing/components/Navbar.tsx

import {useState} from 'react'
import {Link} from 'react-router-dom'
import {Menu, Zap} from 'lucide-react'
import {Button} from '@/components/ui/button'
import {Sheet, SheetClose, SheetContent, SheetTrigger,} from '@/components/ui/sheet'

export const Navbar = () => {
    const [open, setOpen] = useState(false)

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <nav
                aria-label="Main navigation"
                className="container mx-auto flex h-16 items-center justify-between px-4"
            >
                {/* Logo */}
                <Link
                    to="/"
                    className="flex items-center gap-2 font-bold text-xl text-primary"
                    aria-label="Fixi home"
                >
                    <Zap className="h-6 w-6" aria-hidden="true"/>
                    Fixi
                </Link>

                {/* Desktop nav */}
                <div className="hidden md:flex items-center gap-3">
                    <Button variant="ghost" asChild>
                        <Link to="/login">Log In</Link>
                    </Button>
                    <Button asChild>
                        <Link to="/register">Sign Up</Link>
                    </Button>
                </div>

                {/* Mobile nav */}
                <Sheet open={open} onOpenChange={setOpen}>
                    <SheetTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="md:hidden"
                            aria-label="Open menu"
                        >
                            <Menu className="h-5 w-5" aria-hidden="true"/>
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-64">
                        <div className="flex flex-col gap-4 mt-8">
                            <SheetClose asChild>
                                <Button variant="ghost" className="w-full" asChild>
                                    <Link to="/login">Log In</Link>
                                </Button>
                            </SheetClose>
                            <SheetClose asChild>
                                <Button className="w-full" asChild>
                                    <Link to="/register">Sign Up</Link>
                                </Button>
                            </SheetClose>
                        </div>
                    </SheetContent>
                </Sheet>
            </nav>
        </header>
    )
}