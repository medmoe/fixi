import {describe, expect, it, vi} from "vitest"
import {render, screen} from "@testing-library/react"
import {MemoryRouter} from "react-router-dom"

import {AudiencePitch} from "../AudiencePitch"

vi.mock("lucide-react", () => ({
    Check: (props: any) => <svg data-testid="check-icon" {...props} />,
}))

vi.mock("@/components/ui/button", () => ({
    Button: ({asChild, children, ...props}: any) => {
        if (asChild) {
            return children
        }

        return <button {...props}>{children}</button>
    },
}))

const renderAudiencePitch = () =>
    render(
        <MemoryRouter future={{v7_startTransition: true, v7_relativeSplatPath: true}}>
            <AudiencePitch/>
        </MemoryRouter>,
    )

describe("AudiencePitch", () => {
    it("renders the section heading", () => {
        renderAudiencePitch()

        expect(
            screen.getByRole("heading", {
                level: 2,
                name: /built for everyone/i,
            }),
        ).toBeInTheDocument()
    })

    it("renders the section description", () => {
        renderAudiencePitch()

        expect(
            screen.getByText(
                /whether you need a job done or want to grow your trade business/i,
            ),
        ).toBeInTheDocument()
    })

    it("renders both audience cards", () => {
        renderAudiencePitch()

        expect(
            screen.getByRole("heading", {
                level: 3,
                name: /get the job done right/i,
            }),
        ).toBeInTheDocument()

        expect(
            screen.getByRole("heading", {
                level: 3,
                name: /grow your trade business/i,
            }),
        ).toBeInTheDocument()
    })

    it("renders all customer benefits", () => {
        renderAudiencePitch()

        expect(
            screen.getByText(/verified and vetted professionals only/i),
        ).toBeInTheDocument()

        expect(
            screen.getByText(/secure booking and payment protection/i),
        ).toBeInTheDocument()

        expect(
            screen.getByText(/real reviews from real customers/i),
        ).toBeInTheDocument()

        expect(
            screen.getByText(/service radius filtering/i),
        ).toBeInTheDocument()

        expect(
            screen.getByText(/instant availability status on every profile/i),
        ).toBeInTheDocument()
    })

    it("renders all worker benefits", () => {
        renderAudiencePitch()

        expect(
            screen.getByText(/set your own rates and availability/i),
        ).toBeInTheDocument()

        expect(
            screen.getByText(/low platform fees/i),
        ).toBeInTheDocument()

        expect(
            screen.getByText(/build a verified review portfolio/i),
        ).toBeInTheDocument()

        expect(
            screen.getByText(/access a growing local client base/i),
        ).toBeInTheDocument()

        expect(
            screen.getByText(/get paid quickly and securely/i),
        ).toBeInTheDocument()
    })

    it("renders two benefit lists", () => {
        renderAudiencePitch()

        expect(screen.getAllByRole("list")).toHaveLength(2)
    })

    it("renders ten benefit items", () => {
        renderAudiencePitch()

        expect(screen.getAllByRole("listitem")).toHaveLength(10)
    })

    it("renders a check icon for every benefit", () => {
        renderAudiencePitch()

        expect(screen.getAllByTestId("check-icon")).toHaveLength(10)
    })

    it("renders the customer CTA", () => {
        renderAudiencePitch()

        const link = screen.getByRole("link", {
            name: /find a professional/i,
        })

        expect(link).toHaveAttribute(
            "href",
            "/register?role=customer",
        )
    })

    it("renders the worker CTA", () => {
        renderAudiencePitch()

        const link = screen.getByRole("link", {
            name: /offer my services/i,
        })

        expect(link).toHaveAttribute(
            "href",
            "/register?role=worker",
        )
    })

    it("associates the section with its heading", () => {
        renderAudiencePitch()

        const section = screen
            .getByRole("heading", {
                level: 2,
                name: /built for everyone/i,
            })
            .closest("section")

        expect(section).toHaveAttribute(
            "aria-labelledby",
            "audience-heading",
        )
    })
})
