import {describe, expect, it, vi} from "vitest"
import {render, screen} from "@testing-library/react"
import {MemoryRouter} from "react-router-dom"

import {Hero} from "../Hero"

vi.mock("lucide-react", () => ({
    ArrowRight: (props: any) => <svg data-testid="arrow-right-icon" {...props} />,
    Search: (props: any) => <svg data-testid="search-icon" {...props} />,
    Wrench: (props: any) => <svg data-testid="wrench-icon" {...props} />,
}))

vi.mock("@/components/ui/button", () => ({
    Button: ({asChild, children, ...props}: any) => {
        if (asChild) {
            return children
        }

        return <button {...props}>{children}</button>
    },
}))

const renderHero = () =>
    render(
        <MemoryRouter future={{v7_startTransition: true, v7_relativeSplatPath: true}}>
            <Hero/>
        </MemoryRouter>,
    )

describe("Hero", () => {
    it("renders the main heading", () => {
        renderHero()

        expect(
            screen.getByRole("heading", {
                level: 1,
                name: /connect with trusted local professionals/i,
            }),
        ).toBeInTheDocument()
    })

    it("renders the supporting description", () => {
        renderHero()

        expect(
            screen.getByText(
                /fixi bridges the gap between customers who need skilled work done/i,
            ),
        ).toBeInTheDocument()
    })

    it("renders the customer CTA", () => {
        renderHero()

        const link = screen.getByRole("link", {
            name: /find a professional/i,
        })

        expect(link).toBeInTheDocument()
        expect(link).toHaveAttribute(
            "href",
            "/register?role=customer",
        )
    })

    it("renders the worker CTA", () => {
        renderHero()

        const link = screen.getByRole("link", {
            name: /offer my services/i,
        })

        expect(link).toBeInTheDocument()
        expect(link).toHaveAttribute(
            "href",
            "/register?role=worker",
        )
    })

    it("renders the illustration placeholder", () => {
        renderHero()

        expect(
            screen.getByText(/platform illustration/i),
        ).toBeInTheDocument()
    })

    it("renders the expected icons", () => {
        renderHero()

        expect(screen.getByTestId("search-icon")).toBeInTheDocument()
        expect(screen.getByTestId("wrench-icon")).toBeInTheDocument()

        expect(
            screen.getAllByTestId("arrow-right-icon"),
        ).toHaveLength(2)
    })

    it("associates the section with its heading", () => {
        renderHero()

        const section = screen
            .getByRole("heading", {
                level: 1,
                name: /connect with trusted local professionals/i,
            })
            .closest("section")

        expect(section).toHaveAttribute(
            "aria-labelledby",
            "hero-heading",
        )
    })
})
