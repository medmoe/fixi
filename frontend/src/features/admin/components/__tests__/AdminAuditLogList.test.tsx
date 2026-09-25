import {describe, expect, it} from "vitest";
import {render, screen} from "@testing-library/react";
import {AdminAuditLogList} from "../AdminAuditLogList";

describe("AdminAuditLogList", () => {
    it("shows an empty-state message when there are no entries", () => {
        render(<AdminAuditLogList entries={[]}/>);
        expect(screen.getByText("No actions recorded yet.")).toBeInTheDocument();
    });

    it("renders a translated label for a known action", () => {
        render(<AdminAuditLogList entries={[
            {id: 1, action: "suspend_user", target_type: "user", target_id: 1, actor_id: 2, reason: null, created_at: "2023-01-01T00:00:00Z", updated_at: null},
        ]}/>);
        expect(screen.getByText("Account suspended")).toBeInTheDocument();
    });

    it("shows the reason when present", () => {
        render(<AdminAuditLogList entries={[
            {id: 1, action: "suspend_user", target_type: "user", target_id: 1, actor_id: 2, reason: "Policy violation", created_at: "2023-01-01T00:00:00Z", updated_at: null},
        ]}/>);
        expect(screen.getByText("Policy violation")).toBeInTheDocument();
    });

    it("renders one entry per item", () => {
        render(<AdminAuditLogList entries={[
            {id: 1, action: "suspend_user", target_type: "user", target_id: 1, actor_id: 2, reason: null, created_at: "2023-01-01T00:00:00Z", updated_at: null},
            {id: 2, action: "reactivate_user", target_type: "user", target_id: 1, actor_id: 2, reason: null, created_at: "2023-01-02T00:00:00Z", updated_at: null},
        ]}/>);
        expect(screen.getAllByTestId("audit-log-entry")).toHaveLength(2);
    });
});
