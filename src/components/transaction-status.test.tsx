import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TransactionStatus } from "./transaction-status";

describe("TransactionStatus", () => {
  it("renders nothing when idle", () => {
    const { container } = render(<TransactionStatus stage="idle" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows confirmation with an Explorer link", () => {
    render(
      <TransactionStatus
        stage="confirmed"
        signature="sig123"
        explorerUrl="https://explorer.solana.com/tx/sig123?cluster=devnet"
      />,
    );
    expect(screen.getByText("Confirmed")).toBeVisible();
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "https://explorer.solana.com/tx/sig123?cluster=devnet",
    );
  });

  it("shows one-sentence failures", () => {
    render(<TransactionStatus stage="failed" error="You declined the signature." />);
    expect(screen.getByText("Failed")).toBeVisible();
    expect(screen.getByText("You declined the signature.")).toBeVisible();
  });

  it("announces in-progress stages politely", () => {
    render(<TransactionStatus stage="signing" />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Waiting for wallet signature…",
    );
  });

  it("explains the unknown state and warns against blind re-sends", () => {
    render(
      <TransactionStatus
        stage="unknown"
        signature="sig123"
        explorerUrl="https://explorer.solana.com/tx/sig123?cluster=devnet"
      />,
    );
    expect(screen.getByText(/confirmation timed out/i)).toBeVisible();
    expect(screen.getByText(/never re-send blindly/i)).toBeVisible();
    expect(screen.getByText("sig123")).toBeVisible();
  });

  it("guides when a failure carries no message", () => {
    render(<TransactionStatus stage="failed" />);
    expect(screen.getByText(/check your wallet activity/i)).toBeVisible();
  });
});
