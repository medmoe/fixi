import {describe, expect, it} from "vitest";
import {render, screen} from "@testing-library/react";
import {UserStatusBadge} from "../UserStatusBadge";

describe("UserStatusBadge", () => {
    it("shows Active when not suspended", () => {
        render(<UserStatusBadge isSuspended={false}/>);
        expect(screen.getByText("Active")).toBeInTheDocument();
    });

    it("shows Suspended when suspended", () => {
        render(<UserStatusBadge isSuspended={true}/>);
        expect(screen.getByText("Suspended")).toBeInTheDocument();
    });
});
