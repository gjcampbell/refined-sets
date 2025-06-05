use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct IndexRing {
    data: Vec<u8>,
    head: usize, 
    len: usize,  
}

#[wasm_bindgen]
impl IndexRing {
    #[wasm_bindgen(constructor)]
    pub fn new(slots: usize) -> IndexRing {
        IndexRing {
            data: vec![0; slots * 3],
            head: 0,
            len: 0,
        }
    }

    fn slot_to_byte(&self, slot_idx: usize) -> usize {
        (slot_idx % self.capacity_in_slots()) * 3
    }

    fn capacity_in_slots(&self) -> usize {
        self.data.len() / 3
    }

    pub fn push(&mut self, value: u32) {
        assert!(value <= 0xFFFFFF);
        if self.len == self.capacity_in_slots() {
            // needs resize (similar to above: grow by 2× slots)
            let new_slots = self.capacity_in_slots().max(1) * 2;
            let mut new_data = vec![0; new_slots * 3];
            // copy old contents into new_data in correct order
            for i in 0..self.len {
                let v = self.get(i);
                let off = i * 3;
                new_data[off] = (v & 0xFF) as u8;
                new_data[off + 1] = ((v >> 8) & 0xFF) as u8;
                new_data[off + 2] = ((v >> 16) & 0xFF) as u8;
            }
            self.data = new_data;
            self.head = 0;
        }
        let tail_slot = (self.head + self.len) % self.capacity_in_slots();
        let byte_off = self.slot_to_byte(tail_slot);
        self.data[byte_off] = (value & 0xFF) as u8;
        self.data[byte_off + 1] = ((value >> 8) & 0xFF) as u8;
        self.data[byte_off + 2] = ((value >> 16) & 0xFF) as u8;
        self.len += 1;
    }

    pub fn shift(&mut self) -> Option<u32> {
        if self.len == 0 {
            return None;
        }
        let byte_off = self.slot_to_byte(self.head);
        let val = u32::from(self.data[byte_off])
            | (u32::from(self.data[byte_off + 1]) << 8)
            | (u32::from(self.data[byte_off + 2]) << 16);
        self.head = (self.head + 1) % self.capacity_in_slots();
        self.len -= 1;
        Some(val)
    }

    pub fn pop(&mut self) -> Option<u32> {
        if self.len == 0 {
            return None;
        }
        let byte_off = self.slot_to_byte(self.head);
        let val = u32::from(self.data[byte_off])
            | (u32::from(self.data[byte_off + 1]) << 8)
            | (u32::from(self.data[byte_off + 2]) << 16);
        self.head = (self.head + 1) % self.capacity_in_slots();
        self.len -= 1;
        Some(val)
    }

    pub fn get(&self, index: usize) -> u32 {
        assert!(index < self.len);
        let slot = (self.head + index) % self.capacity_in_slots();
        let off = slot * 3;
        u32::from(self.data[off])
            | (u32::from(self.data[off + 1]) << 8)
            | (u32::from(self.data[off + 2]) << 16)
    }

    pub fn len(&self) -> usize {
        self.len
    }

    #[wasm_bindgen(js_name = toArray)]
    pub fn to_array(&self) -> Vec<u32> {
        let mut out = Vec::with_capacity(self.len);
        for i in 0..self.len {
            out.push(self.get(i));
        }
        out
    }

    #[wasm_bindgen(js_name = compact)]
    pub fn compact(&mut self) {
        let new_slots = self.len;
        let mut new_data = vec![0; new_slots * 3];
        for i in 0..self.len {
            let v = self.get(i);
            let off = i * 3;
            new_data[off] = (v & 0xFF) as u8;
            new_data[off + 1] = ((v >> 8) & 0xFF) as u8;
            new_data[off + 2] = ((v >> 16) & 0xFF) as u8;
        }
        self.data = new_data;
        self.head = 0;
    }
}
