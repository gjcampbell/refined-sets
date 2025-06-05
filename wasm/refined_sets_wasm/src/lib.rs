use wasm_bindgen::prelude::*;

pub mod packed_index;
pub mod hole_array;
pub mod utils;

#[wasm_bindgen]
pub fn version() -> String {
    "refined_sets_wasm v0.1.0".into()
}
