# refined_sets_wasm: Local Environment Setup

This crate provides low‐level Rust/WASM support for RefinedSets (packed buffers, hole arrays, compaction). Follow these steps to prepare your environment and build the WASM artifact.

---

## Prerequisites

1. **Rust Toolchain**  
   Rust 1.87.0 is pinned in `rust-toolchain.toml`. Install Rust via one of:

    - **Chocolatey (Windows)**
        ```powershell
        choco install rustup.install -y
        rustup default 1.87.0
        ```

    After installation, Rust will automatically install the `wasm32-unknown-unknown` target and the `rust-lld` component (as specified in `rust-toolchain.toml`).

2. **wasm-pack**  
   `wasm-pack 0.13.1` is required. Install or upgrade:

    ```powershell
    # If not already present:
    cargo install wasm-pack --version 0.13.1

    # If installed but not the correct version:
    wasm-pack --version  # if output ≠ "wasm-pack 0.13.1", run:
    cargo install wasm-pack --version 0.13.1 --force
    ```

## Build

```powershell
wasm-pack build --target bundler --out-dir ../../pkg
```
