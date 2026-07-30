import {describe, expect, it, vi} from "vitest"
import {render, screen} from "@testing-library/react"
import {MemoryRouter} from "react-router-dom"

import {Footer} from "../Footer"

vi.mock("lucide-react", () => ({
    Zap: (props: any) => <svg data-testid="zap-icon" {...props} />,
}))

const renderFooter = () =>
    render(
        <MemoryRouter>
            <Footer/>
        </MemoryRouter>,
    )

describe("Footer", () => {
    it("renders the logo", () => {
        renderFooter()

        const logo = screen.getByRole("link", {
            name: /fixi home/i,
        })

        expect(logo).toBeInTheDocument()
        expect(logo).toHaveAttribute("href", "/")
        expect(screen.getByText("Fixi")).toBeInTheDocument()
    })

    it("renders the logo icon", () => {
        renderFooter()

        expect(screen.getByTestId("zap-icon")).toBeInTheDocument()
    })

    it("renders the copyright notice with the current year", () => {
        renderFooter()

        const year = new Date().getFullYear()

        expect(
            screen.getByText(
                new RegExp(`©\\s*${year}\\s*Fixi\\. All rights reserved\\.`, "i"),
            ),
        ).toBeInTheDocument()
    })

    it("renders the footer navigation", () => {
        renderFooter()

        expect(
            screen.getByRole("navigation", {
                name: /footer navigation/i,
            }),
        ).toBeInTheDocument()
    })

    it("renders the login link", () => {
        renderFooter()

        const loginLink = screen.getByRole("link", {
            name: /log in/i,
        })

        expect(loginLink).toHaveAttribute("href", "/login")
    })

    it("renders the sign up link", () => {
        renderFooter()

        const registerLink = screen.getByRole("link", {
            name: /sign up/i,
        })

        expect(registerLink).toHaveAttribute("href", "/register")
    })

    it("renders exactly three links", () => {
        renderFooter()

        expect(screen.getAllByRole("link")).toHaveLength(3)
    })
})
