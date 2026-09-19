"use client";

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GuestAdoptForm } from "./guest-adopt-form";

describe("GuestAdoptForm", () => {
  it("blocks an invalid name and never calls onAdopt", () => {
    const onAdopt = vi.fn();
    render(<GuestAdoptForm onAdopt={onAdopt} />);
    fireEvent.change(screen.getByLabelText(/name your companion/i), {
      target: { value: "x" },
    });
    fireEvent.click(screen.getByRole("button", { name: /adopt companion/i }));
    expect(screen.getByRole("alert")).toBeVisible();
    expect(onAdopt).not.toHaveBeenCalled();
  });

  it("adopts with the chosen name, species, and personality", () => {
    const onAdopt = vi.fn();
    render(<GuestAdoptForm onAdopt={onAdopt} />);
    fireEvent.change(screen.getByLabelText(/name your companion/i), {
      target: { value: "Mochi" },
    });
    fireEvent.click(screen.getByText("Moss pup"));
    fireEvent.click(screen.getByText("Brave"));
    fireEvent.click(screen.getByRole("button", { name: /adopt companion/i }));
    expect(onAdopt).toHaveBeenCalledTimes(1);
    expect(onAdopt).toHaveBeenCalledWith({
      name: "Mochi",
      species: "moss_pup",
      personality: "brave",
    });
  });
});
