
import React from "react"
import { describe, expect, it, vi } from "vitest"
import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { renderWithProviders } from "@/test/renderWithProviders"

import { Navbar } from "../Navbar"

// --------------------
// Mocks
// --------------------

// Partial mock (importOriginal) rather than a full replacement -- Navbar now
// pulls in LanguageSwitcher, whose dependency chain (useChangeLanguage ->
// features/user -> features/auth -> features/job) reaches other lucide
// icons this file doesn't otherwise care about. A full replacement here
// would throw for any of those instead of just rendering the real icon.
vi.mock("lucide-react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("lucide-react")>()
  return {
    ...actual,
    Menu: () => <svg data-testid="menu-icon" />,
    Zap: () => <svg data-testid="zap-icon" />,
  }
})

// Forwards its ref (via React.forwardRef) rather than dropping it, same as
// the real Button -- LanguageSwitcher's (unmocked) Radix DropdownMenuTrigger
// wraps a Button with `asChild` and needs a real ref on it, or React warns
// "Function components cannot be given refs."
vi.mock("@/components/ui/button", () => ({
  Button: React.forwardRef<HTMLButtonElement, any>(({ asChild, children, ...props }, ref) => {
    if (asChild) {
      return children
    }

    return <button ref={ref} {...props}>{children}</button>
  }),
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

const renderNavbar = () => renderWithProviders(<Navbar />)

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



