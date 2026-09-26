import {beforeEach, describe, expect, it, vi} from "vitest";
import {render, screen, within} from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {NotificationDeliveryCard} from "../NotificationDeliveryCard";
import {useNotificationDeliveryStats} from "../../hooks/useNotificationDeliveryStats";
import type {NotificationFailureRateRead} from "../../types/notificationStats.types";

vi.mock("../../hooks/useNotificationDeliveryStats", () => ({useNotificationDeliveryStats: vi.fn()}));

const row = (overrides: Partial<NotificationFailureRateRead>): NotificationFailureRateRead => ({
    channel: "email", provider: "mailjet", sent: 100, failed: 0, skipped: 0, attempted: 100, failure_rate: 0, ...overrides,
});

describe("NotificationDeliveryCard", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useNotificationDeliveryStats).mockReturnValue({data: [], isLoading: false, isError: false} as any);
    });

    it("queries the last 24 hours by default and can switch to 7 days", async () => {
        render(<NotificationDeliveryCard/>);
        expect(useNotificationDeliveryStats).toHaveBeenLastCalledWith(24);
        expect(screen.getByRole("button", {name: "Last 24 hours"})).toHaveAttribute("aria-pressed", "true");

        await userEvent.click(screen.getByRole("button", {name: "Last 7 days"}));

        expect(useNotificationDeliveryStats).toHaveBeenLastCalledWith(168);
        expect(screen.getByRole("button", {name: "Last 7 days"})).toHaveAttribute("aria-pressed", "true");
    });

    it("shows the empty state when nothing was sent", () => {
        render(<NotificationDeliveryCard/>);
        expect(screen.getByText("No notifications were sent in this window.")).toBeInTheDocument();
    });

    it("shows an error message when loading fails", () => {
        vi.mocked(useNotificationDeliveryStats).mockReturnValue({data: undefined, isLoading: false, isError: true} as any);
        render(<NotificationDeliveryCard/>);
        expect(screen.getByText("Couldn't load notification delivery stats.")).toBeInTheDocument();
    });

    it("renders one row per channel/provider with counts and rate", () => {
        vi.mocked(useNotificationDeliveryStats).mockReturnValue({
            data: [row({channel: "email", sent: 98, failed: 2, attempted: 100, failure_rate: 0.02}), row({channel: "sms", provider: "capcom6"})],
            isLoading: false,
            isError: false,
        } as any);
        render(<NotificationDeliveryCard/>);

        const rows = screen.getAllByTestId("notification-delivery-row");
        expect(rows).toHaveLength(2);
        expect(within(rows[0]).getByText("Email")).toBeInTheDocument();
        expect(within(rows[0]).getByText("mailjet")).toBeInTheDocument();
        expect(within(rows[0]).getByText("2%")).toBeInTheDocument();
        expect(within(rows[1]).getByText("SMS")).toBeInTheDocument();
    });

    it("highlights rows above the 5% threshold only", () => {
        vi.mocked(useNotificationDeliveryStats).mockReturnValue({
            data: [row({channel: "sms", provider: "capcom6", failed: 12, attempted: 100, failure_rate: 0.12}), row({channel: "email", failure_rate: 0.05})],
            isLoading: false,
            isError: false,
        } as any);
        render(<NotificationDeliveryCard/>);

        const [sms, email] = screen.getAllByTestId("notification-delivery-row");
        expect(sms).toHaveAttribute("data-alert", "true");
        expect(within(sms).getByLabelText("High failure rate")).toBeInTheDocument();
        expect(email).not.toHaveAttribute("data-alert");
    });

    it("shows 'No data' rather than 0% when nothing was attempted", () => {
        vi.mocked(useNotificationDeliveryStats).mockReturnValue({
            data: [row({channel: "push", provider: "fcm", sent: 0, skipped: 4, attempted: 0, failure_rate: null})],
            isLoading: false,
            isError: false,
        } as any);
        render(<NotificationDeliveryCard/>);

        const [push] = screen.getAllByTestId("notification-delivery-row");
        expect(within(push).getByText("No data")).toBeInTheDocument();
        expect(within(push).queryByText("0%")).not.toBeInTheDocument();
    });
});
