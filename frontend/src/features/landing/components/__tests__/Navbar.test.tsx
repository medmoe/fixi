
import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"

import { Navbar } from "../Navbar"

// --------------------
// Mocks
// --------------------

vi.mock("lucide-react", () => ({
  Menu: () => <svg data-testid="menu-icon" />,
  Zap: () => <svg data-testid="zap-icon" />,
}))

vi.mock("@/components/ui/button", () => ({
  Button: ({ asChild, children, ...props }: any) => {
    if (asChild) {
      return children
    }

    return <button {...props}>{children}</button>
  },
}))

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children }: any) => <>{children}</>,
  SheetTrigger: ({ children }: any) => <>{children}</>,
  SheetContent: ({ children }: any) => (
    <div data-testid="sheet-content">{children}</div>
  ),
  SheetClose: ({ children }: any) => <>{children}</>,
}))

// --------------------
// Helpers
// --------------------

const renderNavbar = () =>
  render(
    <MemoryRouter future={{v7_startTransition: true, v7_relativeSplatPath: true}}>
      <Navbar />
    </MemoryRouter>,
  )

// --------------------
// Tests
// --------------------

describe("Navbar", () => {
  it("renders the application logo", () => {
    renderNavbar()

    expect(
      screen.getByRole("link", { name: /fixi home/i }),
    ).toBeInTheDocument()

    expect(screen.getByText("Fixi")).toBeInTheDocument()
  })

  it("links the logo to the home page", () => {
    renderNavbar()

    expect(
      screen.getByRole("link", { name: /fixi home/i }),
    ).toHaveAttribute("href", "/")
  })

  it("renders login links", () => {
    renderNavbar()

    const loginLinks = screen.getAllByRole("link", {
      name: /log in/i,
    })

    expect(loginLinks).toHaveLength(2)

    loginLinks.forEach((link) => {
      expect(link).toHaveAttribute("href", "/login")
    })
  })

  it("renders register links", () => {
    renderNavbar()

    const registerLinks = screen.getAllByRole("link", {
      name: /sign up/i,
    })

    expect(registerLinks).toHaveLength(2)

    registerLinks.forEach((link) => {
      expect(link).toHaveAttribute("href", "/register")
    })
  })

  it("renders the mobile menu button", () => {
    renderNavbar()

    expect(
      screen.getByRole("button", {
        name: /open menu/i,
      }),
    ).toBeInTheDocument()
  })

  it("renders sheet content", () => {
    renderNavbar()

    expect(
      screen.getByTestId("sheet-content"),
    ).toBeInTheDocument()
  })

  it("allows clicking the mobile menu button", async () => {
    const user = userEvent.setup()

    renderNavbar()

    await user.click(
      screen.getByRole("button", {
        name: /open menu/i,
      }),
    )

    expect(
      screen.getByTestId("sheet-content"),
    ).toBeInTheDocument()
  })
})



