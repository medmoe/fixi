// DescriptionField.test.tsx
import {describe, expect, it} from "vitest";
import {act, render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {FormProvider, useForm} from "react-hook-form";
import {DescriptionField} from "@/features/job";

const Wrapper = ({defaultValues = {}}: { defaultValues?: Record<string, unknown> }) => {
    const methods = useForm({defaultValues});
    return (
        <FormProvider {...methods}>
            <form>
                <DescriptionField/>
            </form>
        </FormProvider>
    );
};

describe("DescriptionField", () => {

    describe("rendering", () => {
        it("renders the label", () => {
            render(<Wrapper/>);
            expect(screen.getByLabelText("Job Description")).toBeInTheDocument();
        });

        it("renders the placeholder", () => {
            render(<Wrapper/>);
            expect(screen.getByPlaceholderText(/describe the job in detail/i)).toBeInTheDocument();
        });

        it("renders the character counter at 0 by default", () => {
            render(<Wrapper/>);
            expect(screen.getByText("0/1000 chars")).toBeInTheDocument();
        });

        it("renders with a pre-filled default value", () => {
            render(<Wrapper defaultValues={{description: "Pipe burst under cabinet"}}/>);
            expect(screen.getByDisplayValue("Pipe burst under cabinet")).toBeInTheDocument();
        });

        it("renders a textarea not an input", () => {
            render(<Wrapper/>);
            expect(screen.getByRole("textbox", {name: "Job Description"})).toBeInTheDocument();
            expect(screen.getByRole("textbox", {name: "Job Description"}).tagName).toBe("TEXTAREA");
        });
    });

    describe("character counter", () => {
        it("updates counter as user types", async () => {
            render(<Wrapper/>);
            const textarea = screen.getByLabelText("Job Description");
            await act(async () => await userEvent.type(textarea, "Hello"))
            expect(screen.getByText("5/1000 chars")).toBeInTheDocument();
        });

        it("shows counter in normal style when under the limit", () => {
            render(<Wrapper defaultValues={{description: "Short description"}}/>);
            const counter = screen.getByText("17/1000 chars");
            expect(counter).toHaveClass("text-muted-foreground");
            expect(counter).not.toHaveClass("text-destructive");
        });

        it("shows counter in destructive style when over 1000 characters", () => {
            render(<Wrapper defaultValues={{description: "a".repeat(1001)}}/>);
            const counter = screen.getByText("1001/1000 chars");
            expect(counter).toHaveClass("text-destructive");
            expect(counter).toHaveClass("font-bold");
        });

        it("shows counter in normal style at exactly 1000 characters", () => {
            render(<Wrapper defaultValues={{description: "a".repeat(1000)}}/>);
            const counter = screen.getByText("1000/1000 chars");
            expect(counter).toHaveClass("text-muted-foreground");
            expect(counter).not.toHaveClass("text-destructive");
        });
    });

    describe("accessibility", () => {
        it("has aria-live polite on the counter", () => {
            render(<Wrapper/>);
            const counter = screen.getByText("0/1000 chars");
            expect(counter).toHaveAttribute("aria-live", "polite");
        });

        it("label is associated with the textarea via htmlFor", () => {
            render(<Wrapper/>);
            const textarea = screen.getByLabelText("Job Description");
            expect(textarea).toHaveAttribute("id", "job-description");
        });
    });

    describe("user interaction", () => {
        it("accepts multiline input", async () => {
            render(<Wrapper/>);
            const textarea = screen.getByLabelText("Job Description");
            await act(async () => await userEvent.type(textarea, "Line one{enter}Line two"));
            expect(textarea).toHaveValue("Line one\nLine two");
        });

        it("clears correctly when content is deleted", async () => {
            render(<Wrapper defaultValues={{description: "Some description"}}/>);
            const textarea = screen.getByLabelText("Job Description");
            await act(async () => await userEvent.clear(textarea));
            expect(screen.getByText("0/1000 chars")).toBeInTheDocument();
        });
    });
});