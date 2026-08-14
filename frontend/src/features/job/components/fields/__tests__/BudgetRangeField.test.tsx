// BudgetRangeField.test.tsx
import {describe, expect, it} from "vitest";
import {act, render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {FormProvider, useForm} from "react-hook-form";
import {BudgetRangeField} from "@/features/job";

const Wrapper = ({defaultValues = {}}: { defaultValues?: Record<string, unknown> }) => {
    const methods = useForm({defaultValues});
    return (
        <FormProvider {...methods}>
            <form>
                <BudgetRangeField/>
            </form>
        </FormProvider>
    );
};

describe("BudgetRangeField", () => {

    describe("rendering", () => {
        it("renders the Budget Range label", () => {
            render(<Wrapper/>);
            expect(screen.getByText("Budget Range")).toBeInTheDocument();
        });

        it("renders the min input", () => {
            render(<Wrapper/>);
            expect(screen.getByLabelText("Minimum budget")).toBeInTheDocument();
        });

        it("renders the max input", () => {
            render(<Wrapper/>);
            expect(screen.getByLabelText("Maximum budget")).toBeInTheDocument();
        });

        it("renders Min and Max secondary labels", () => {
            render(<Wrapper/>);
            expect(screen.getByText("Min ($)")).toBeInTheDocument();
            expect(screen.getByText("Max ($)")).toBeInTheDocument();
        });

        it("renders the separator between min and max", () => {
            render(<Wrapper/>);
            expect(screen.getByText("—")).toBeInTheDocument();
        });

        it("renders both inputs as type number", () => {
            render(<Wrapper/>);
            expect(screen.getByLabelText("Minimum budget")).toHaveAttribute("type", "number");
            expect(screen.getByLabelText("Maximum budget")).toHaveAttribute("type", "number");
        });

        it("renders with pre-filled default values", () => {
            render(<Wrapper defaultValues={{budget_min: 100, budget_max: 500}}/>);
            expect(screen.getByLabelText("Minimum budget")).toHaveValue(100);
            expect(screen.getByLabelText("Maximum budget")).toHaveValue(500);
        });
    });

    describe("user interaction", () => {
        it("accepts numeric input in min field", async () => {
            render(<Wrapper/>);
            const minInput = screen.getByLabelText("Minimum budget");
            await act(async () => await userEvent.type(minInput, "100"));
            expect(minInput).toHaveValue(100);
        });

        it("accepts numeric input in max field", async () => {
            render(<Wrapper/>);
            const maxInput = screen.getByLabelText("Maximum budget");
            await act(async () => await userEvent.type(maxInput, "500"));
            expect(maxInput).toHaveValue(500);
        });

        it("accepts decimal values in min field", async () => {
            render(<Wrapper/>);
            const minInput = screen.getByLabelText("Minimum budget");
            await act(async () => await userEvent.type(minInput, "75.50"));
            expect(minInput).toHaveValue(75.50);
        });

        it("accepts decimal values in max field", async () => {
            render(<Wrapper/>);
            const maxInput = screen.getByLabelText("Maximum budget");
            await act(async () => await userEvent.type(maxInput, "200.99"));
            expect(maxInput).toHaveValue(200.99);
        });

        it("clears min field and sets value to undefined", async () => {
            let capturedValue: unknown;
            const Wrapper = () => {
                const methods = useForm({defaultValues: {budget_min: 100}});
                capturedValue = methods.watch("budget_min");
                return (
                    <FormProvider {...methods}>
                        <form><BudgetRangeField/></form>
                    </FormProvider>
                );
            };
            render(<Wrapper/>);
            const minInput = screen.getByLabelText("Minimum budget");
            await act(async () => await userEvent.clear(minInput));
            expect(capturedValue).toBeUndefined();
        });

        it("clears max field correctly", async () => {
            let capturedValue: unknown;
            const Wrapper = () => {
                const methods = useForm({defaultValues: {budget_max: 500}});
                capturedValue = methods.watch("budget_max");
                return (
                    <FormProvider {...methods}>
                        <form><BudgetRangeField/></form>
                    </FormProvider>
                )
            };
            render(<Wrapper/>);
            const maxInput = screen.getByLabelText("Maximum budget");
            await act(async () => await userEvent.clear(maxInput));
            expect(capturedValue).toBeUndefined();
        });
    });

    describe("accessibility", () => {
        it("min input has correct id", () => {
            render(<Wrapper/>);
            expect(screen.getByLabelText("Minimum budget")).toHaveAttribute("id", "budget-min");
        });

        it("max input has correct id", () => {
            render(<Wrapper/>);
            expect(screen.getByLabelText("Maximum budget")).toHaveAttribute("id", "budget-max");
        });

        it("both inputs have min attribute of 0", () => {
            render(<Wrapper/>);
            expect(screen.getByLabelText("Minimum budget")).toHaveAttribute("min", "0");
            expect(screen.getByLabelText("Maximum budget")).toHaveAttribute("min", "0");
        });

        it("both inputs have step of 0.01 for decimal support", () => {
            render(<Wrapper/>);
            expect(screen.getByLabelText("Minimum budget")).toHaveAttribute("step", "0.01");
            expect(screen.getByLabelText("Maximum budget")).toHaveAttribute("step", "0.01");
        });
    });
});