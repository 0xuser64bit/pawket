//! LiteSVM tests for every pawket instruction, and the lockstep replay shared with the web app.
//! Run with `pnpm program:test` (anchor build, then cargo test).

// The harness passes LiteSVM's own `FailedTransactionMetadata` through; boxing it buys nothing.
#![allow(clippy::result_large_err)]

mod harness;

mod adopt;
mod care;
mod guild;
mod lockstep;
mod round_and_dress;
mod wallet;
