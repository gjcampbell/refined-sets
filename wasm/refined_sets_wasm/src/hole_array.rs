// Basic hole-tracking array with compaction logic

pub struct HoleArray<T> {
    data: Vec<Option<T>>,
}

impl<T> HoleArray<T> {
    pub fn new() -> Self {
        Self { data: Vec::new() }
    }

    pub fn push(&mut self, value: T) {
        self.data.push(Some(value));
    }

    pub fn mark_hole(&mut self, index: usize) {
        if let Some(slot) = self.data.get_mut(index) {
            *slot = None;
        }
    }

    pub fn compact(&mut self) {
        self.data.retain(|x| x.is_some());
    }

    pub fn iter_valid(&self) -> impl Iterator<Item = &T> {
        self.data.iter().filter_map(|x| x.as_ref())
    }
}
