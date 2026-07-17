import {describe, expect, it, vi} from "vitest"
import {render, screen} from "@testing-library/react"

import {HowItWorks} from "../HowItWorks"

vi.mock("lucide-react", () => ({
    UserPlus: (props: any) => <svg data-testid="user-plus-icon" {...props} />,
    Users: (props: any) => <svg data-testid="users-icon" {...props} />,
    Star: (props: any) => <svg data-testid="star-icon" {...props} />,
}))

describe("HowItWorks", () => {
    it("renders the section heading", () => {
        render(<HowItWorks/>)

        expect(
            screen.getByRole("heading", {
                level: 2,
                name: /how fixi works/i,
            }),
        ).toBeInTheDocument()
    })

    it("renders the section description", () => {
        render(<HowItWorks/>)

        expect(
            screen.getByText(
                /three simple steps to get things done or grow your client base/i,
            ),
        ).toBeInTheDocument()
    })

    it("renders all three steps", () => {
        render(<HowItWorks/>)

        expect(
            screen.getByRole("heading", {
                level: 3,
                name: /join the platform/i,
            }),
        ).toBeInTheDocument()

        expect(
            screen.getByRole("heading", {
                level: 3,
                name: /connect/i,
            }),
        ).toBeInTheDocument()

        expect(
            screen.getByRole("heading", {
                level: 3,
                name: /complete & review/i,
            }),
        ).toBeInTheDocument()
    })

    it("renders each step description", () => {
        render(<HowItWorks/>)

        expect(
            screen.getByText(
                /register in minutes as a customer looking for help or a worker ready to offer your skills/i,
            ),
        ).toBeInTheDocument()

        expect(
            screen.getByText(
                /browse local jobs or search for top-rated professionals near you/i,
            ),
        ).toBeInTheDocument()

        expect(
            screen.getByText(
                /coordinate securely through the platform, complete the job, and leave a verified review/i,
            ),
        ).toBeInTheDocument()
    })

    it("renders all step numbers", () => {
        render(<HowItWorks/>)

        expect(screen.getByText("01")).toBeInTheDocument()
        expect(screen.getByText("02")).toBeInTheDocument()
        expect(screen.getByText("03")).toBeInTheDocument()
    })

    it("renders one icon for each step", () => {
        render(<HowItWorks/>)

        expect(screen.getByTestId("user-plus-icon")).toBeInTheDocument()
        expect(screen.getByTestId("users-icon")).toBeInTheDocument()
        expect(screen.getByTestId("star-icon")).toBeInTheDocument()
    })

    it("associates the section with its heading", () => {
        render(<HowItWorks/>)

        const section = screen
            .getByRole("heading", {name: /how fixi works/i})
            .closest("section")

        expect(section).toHaveAttribute(
            "aria-labelledby",
            "how-it-works-heading",
        )
    })
})
