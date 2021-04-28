use wasm_bindgen::prelude::*;
extern crate console_error_panic_hook;
use std::panic;

pub fn set_panic_hook() {
    // When the `console_error_panic_hook` feature is enabled, we can call the
    // `set_panic_hook` function at least once during initialization, and then
    // we will get better error messages if our code ever panics.
    //
    // For more details see
    // https://github.com/rustwasm/console_error_panic_hook#readme
    panic::set_hook(Box::new(console_error_panic_hook::hook));
}
#[wasm_bindgen]
extern "C" {
    pub fn alert(s: &str);
}
const CHUNK_SIZE: usize = 16;
#[wasm_bindgen]
pub fn greet(name: &str) {
    alert(&format!("Hello, {}!", name));
}
#[wasm_bindgen]
pub fn start() {
    set_panic_hook();
}
// Compress for size but alas doesn't remember which cube each face belongs to, no culling back faces
// Side is 0:-x  1:-y  2:-z
/*pub fn find(
    side: usize,
    x: usize,
    y: usize,
    z: usize,
    faces: &mut Vec<u32>,
    data_raw: &[u32],
    index_raw: usize,
) {
    let index = match side {
        0 => (x * (CHUNK_SIZE) + y) * (CHUNK_SIZE) + z,
        1 => {
            (x * (CHUNK_SIZE + 1) + y) * (CHUNK_SIZE)
                + z
                + CHUNK_SIZE * CHUNK_SIZE * (CHUNK_SIZE + 1)
        }
        2 => {
            (x * (CHUNK_SIZE) + y) * (CHUNK_SIZE + 1)
                + z
                + CHUNK_SIZE * CHUNK_SIZE * (CHUNK_SIZE + 1) * 2
        }
        _ => 0,
    };
    if faces[index] == 0 {
        faces[index] = data_raw[index_raw];
    } else {
        faces[index] = BAD_VALUE
    }
}*/
const FRONT: usize = 0;
const BACK: usize = 1;
const TOP: usize = 2;
const BOTTOM: usize = 3;
const RIGHT: usize = 4;
const LEFT: usize = 5;
const MAP_BUCKETS: usize = 24;
const MAP_LOOKUP: [usize; 24] = [
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23,
];

// Front Back Top Bottom Right Left
const COLOR_LOOKUP: [[[f32; 4]; 6]; 9] = [
    [
        [
            0.38823529411764707,
            0.22745098039215686,
            0.06666666666666667,
            1.0,
        ],
        [0.30196078431372547, 0.14901960784313725, 0.0, 1.0],
        [
            0.22745098039215686,
            0.5529411764705883,
            0.11372549019607843,
            1.0,
        ],
        [0.7490196078431373, 0.6, 0.34901960784313724, 1.0],
        [
            0.6313725490196078,
            0.45098039215686275,
            0.2235294117647059,
            1.0,
        ],
        [
            0.48627450980392156,
            0.30196078431372547,
            0.14901960784313725,
            1.0,
        ],
    ],
    [
        [0.6, 0.6, 0.6, 1.0],
        [0.7, 0.7, 0.7, 1.0],
        [0.65, 0.65, 0.65, 1.0],
        [0.3, 0.3, 0.3, 1.0],
        [0.4, 0.4, 0.4, 1.0],
        [0.5, 0.5, 0.5, 1.0],
    ],
    [
        [
            0.4392156862745098,
            0.3215686274509804,
            0.043137254901960784,
            1.0,
        ],
        [
            0.39215686274509803,
            0.3137254901960784,
            0.023529411764705882,
            1.0,
        ],
        [
            0.47058823529411764,
            0.34509803921568627,
            0.06274509803921569,
            1.0,
        ],
        [
            0.41568627450980394,
            0.30196078431372547,
            0.03137254901960784,
            1.0,
        ],
        [
            0.37254901960784315,
            0.29411764705882354,
            0.0196078431372549,
            1.0,
        ],
        [
            0.42745098039215684,
            0.3176470588235294,
            0.023529411764705882,
            1.0,
        ],
    ],
    [
        [0.23529411764705882, 0.7803921568627451, 0.0, 0.8],
        [0.19607843137254902, 0.7411764705882353, 0.0, 0.8],
        [0.27450980392156865, 0.8235294117647058, 0.0, 0.8],
        [0.2549019607843137, 0.8, 0.0, 0.8],
        [0.1843137254901961, 0.7254901960784313, 0.0, 0.8],
        [0.2627450980392157, 0.8156862745098039, 0.0, 0.8],
    ],
    [
        [0.8, 0.5, 0.1, 1.0],
        [0.76, 0.55, 0.0, 1.0],
        [0.88, 0.65, 0.06, 1.0],
        [0.9, 0.7, 0.2, 1.0],
        [0.99, 0.8, 0.0, 1.0],
        [0.73, 0.45, 0.05, 1.0],
    ],
    [
        [0.1, 0.5, 0.8, 1.0],
        [0.0, 0.55, 0.76, 1.0],
        [0.06, 0.65, 0.88, 1.0],
        [0.2, 0.7, 0.9, 1.0],
        [0.0, 0.8, 0.99, 1.0],
        [0.05, 0.45, 0.73, 1.0],
    ],
    [
        [0.1, 0.2, 0.8, 0.8],
        [0.0, 0.1, 0.76, 0.8],
        [0.06, 0.1, 0.88, 0.8],
        [0.2, 0.1, 0.9, 0.8],
        [0.0, 0.03, 0.99, 0.8],
        [0.05, 0.15, 0.73, 0.8],
    ],
    [
        [0.8, 0.0, 0.1, 1.0],
        [0.76, 0.05, 0.0, 1.0],
        [0.88, 0.12, 0.06, 1.0],
        [0.9, 0.08, 0.2, 1.0],
        [0.99, 0.03, 0.0, 1.0],
        [0.73, 0.15, 0.05, 1.0],
    ],
    [
        [0.1, 0.1, 0.1, 1.0],
        [0.08, 0.12, 0.15, 1.0],
        [0.03, 0.05, 0.02, 1.0],
        [0.02, 0.07, 0.09, 1.0],
        [0.03, 0.03, 0.03, 1.0],
        [0.02, 0.04, 0.07, 1.0],
    ],
];
pub fn get_index(side: usize, x: usize, y: usize, z: usize) -> usize {
    return (CHUNK_SIZE * CHUNK_SIZE * x + CHUNK_SIZE * y + z) * 6 + side;
}
pub fn get_other_index(x: usize, y: usize, z: usize, c: usize) -> u32 {
    return ((((CHUNK_SIZE + 1) * (CHUNK_SIZE + 1) * x + (CHUNK_SIZE + 1) * y + z) * MAP_BUCKETS)
        + c) as u32;
}
// Side is 0:-x  1:-y  2:-z
pub fn find(
    side: usize,
    x: usize,
    y: usize,
    z: usize,
    faces: &mut Vec<u8>,
    data_raw: &[u8],
    index_raw: usize,
) {
    let index = get_index(side, x, y, z);
    let value = data_raw[index_raw];
    match side {
        0 => {
            if x > 0 {
                let prev = get_index(side + 3, x - 1, y, z);
                if faces[prev] != 0 {
                    faces[prev] = 0;
                } else {
                    faces[index] = value;
                }
            } else {
                faces[index] = value;
            }
        }
        1 => {
            if y > 0 {
                let prev = get_index(side + 3, x, y - 1, z);
                if faces[prev] != 0 {
                    faces[prev] = 0;
                } else {
                    faces[index] = value;
                }
            } else {
                faces[index] = value;
            }
        }
        2 => {
            if z > 0 {
                let prev = get_index(side + 3, x, y, z - 1);
                if faces[prev] != 0 {
                    faces[prev] = 0;
                } else {
                    faces[index] = value;
                }
            } else {
                faces[index] = value;
            }
        }
        3 => {
            faces[index] = value;
        }
        4 => {
            faces[index] = value;
        }
        5 => {
            faces[index] = value;
        }
        _ => {}
    };
}
#[wasm_bindgen]
pub fn compress(data_raw: &[u8]) -> Vec<u32> {
    let mut faces: Vec<u8> = vec![0; CHUNK_SIZE * CHUNK_SIZE * CHUNK_SIZE * 6];
    let mut index_raw: usize = 0;
    for x in 0..CHUNK_SIZE {
        for y in 0..CHUNK_SIZE {
            for z in 0..CHUNK_SIZE {
                // -x
                if data_raw[index_raw] > 0 {
                    for s in 0..6 {
                        find(s, x, y, z, &mut faces, data_raw, index_raw);
                    }
                }
                index_raw += 1;
            }
        }
    }
    let mut positions: Vec<u32> = vec![];
    for x in 0..CHUNK_SIZE {
        for y in 0..CHUNK_SIZE {
            for z in 0..CHUNK_SIZE {
                let xn = get_index(0, x, y, z);
                let yn = xn + 1;
                let zn = xn + 2;
                let xp = xn + 3;
                let yp = xn + 4;
                let zp = xn + 5;
                if faces[xn] > 0 {
                    // L
                    positions.push(get_other_index(x, y, z, MAP_LOOKUP[0]));
                    positions.push(get_other_index(x, y, z + 1, MAP_LOOKUP[1]));
                    positions.push(get_other_index(x, y + 1, z + 1, MAP_LOOKUP[2]));
                    positions.push(get_other_index(x, y + 1, z + 1, MAP_LOOKUP[2]));
                    positions.push(get_other_index(x, y + 1, z, MAP_LOOKUP[3]));
                    positions.push(get_other_index(x, y, z, MAP_LOOKUP[0]));
                }
                if faces[yn] > 0 {
                    // D
                    positions.push(get_other_index(x, y, z, MAP_LOOKUP[4]));
                    positions.push(get_other_index(x + 1, y, z, MAP_LOOKUP[5]));
                    positions.push(get_other_index(x + 1, y, z + 1, MAP_LOOKUP[6]));
                    positions.push(get_other_index(x + 1, y, z + 1, MAP_LOOKUP[6]));
                    positions.push(get_other_index(x, y, z + 1, MAP_LOOKUP[7]));
                    positions.push(get_other_index(x, y, z, MAP_LOOKUP[4]));
                }
                if faces[zn] > 0 {
                    // B
                    positions.push(get_other_index(x, y, z, MAP_LOOKUP[8]));
                    positions.push(get_other_index(x, y + 1, z, MAP_LOOKUP[9]));
                    positions.push(get_other_index(x + 1, y + 1, z, MAP_LOOKUP[10]));
                    positions.push(get_other_index(x + 1, y + 1, z, MAP_LOOKUP[10]));
                    positions.push(get_other_index(x + 1, y, z, MAP_LOOKUP[11]));
                    positions.push(get_other_index(x, y, z, MAP_LOOKUP[8]));
                }
                if faces[xp] > 0 {
                    // R
                    positions.push(get_other_index(x + 1, y, z, MAP_LOOKUP[12]));
                    positions.push(get_other_index(x + 1, y + 1, z, MAP_LOOKUP[13]));
                    positions.push(get_other_index(x + 1, y + 1, z + 1, MAP_LOOKUP[14]));
                    positions.push(get_other_index(x + 1, y + 1, z + 1, MAP_LOOKUP[14]));
                    positions.push(get_other_index(x + 1, y, z + 1, MAP_LOOKUP[15]));
                    positions.push(get_other_index(x + 1, y, z, MAP_LOOKUP[12]));
                }
                if faces[yp] > 0 {
                    // U
                    positions.push(get_other_index(x, y + 1, z, MAP_LOOKUP[16]));
                    positions.push(get_other_index(x, y + 1, z + 1, MAP_LOOKUP[17]));
                    positions.push(get_other_index(x + 1, y + 1, z + 1, MAP_LOOKUP[18]));
                    positions.push(get_other_index(x + 1, y + 1, z + 1, MAP_LOOKUP[18]));
                    positions.push(get_other_index(x + 1, y + 1, z, MAP_LOOKUP[19]));
                    positions.push(get_other_index(x, y + 1, z, MAP_LOOKUP[16]));
                }
                if faces[zp] > 0 {
                    // F
                    positions.push(get_other_index(x, y, z + 1, MAP_LOOKUP[20]));
                    positions.push(get_other_index(x + 1, y, z + 1, MAP_LOOKUP[21]));
                    positions.push(get_other_index(x + 1, y + 1, z + 1, MAP_LOOKUP[22]));
                    positions.push(get_other_index(x + 1, y + 1, z + 1, MAP_LOOKUP[22]));
                    positions.push(get_other_index(x, y + 1, z + 1, MAP_LOOKUP[23]));
                    positions.push(get_other_index(x, y, z + 1, MAP_LOOKUP[20]));
                }
            }
        }
    }
    return positions;
}
pub fn add_color(face: [f32; 4], colors: &mut Vec<f32>, start: u32, offset: f32) {
    for i in 0..3 {
        colors[(start * 4) as usize + i] = face[i] + offset;
    }
    colors[(start * 4) as usize + 3] = face[3];
}
#[wasm_bindgen]
pub fn calc_colors(data_raw: &[u8]) -> Vec<f32> {
    let mut faces: Vec<u8> = vec![0; CHUNK_SIZE * CHUNK_SIZE * CHUNK_SIZE * 6];
    let mut index_raw: usize = 0;
    for x in 0..CHUNK_SIZE {
        for y in 0..CHUNK_SIZE {
            for z in 0..CHUNK_SIZE {
                // -x
                if data_raw[index_raw] > 0 {
                    for s in 0..6 {
                        find(s, x, y, z, &mut faces, data_raw, index_raw);
                    }
                }
                index_raw += 1;
            }
        }
    }
    let mut colors: Vec<f32> =
        vec![0.0; (CHUNK_SIZE + 1) * (CHUNK_SIZE + 1) * (CHUNK_SIZE + 1) * MAP_BUCKETS * 4];
    index_raw = 0;
    for x in 0..CHUNK_SIZE {
        for y in 0..CHUNK_SIZE {
            for z in 0..CHUNK_SIZE {
                let value;
                if data_raw[index_raw] == 0 {
                    index_raw += 1;
                    continue;
                } else {
                    value = (data_raw[index_raw] - 1) as usize;
                }
                let xn = get_index(0, x, y, z);
                let yn = xn + 1;
                let zn = xn + 2;
                let xp = xn + 3;
                let yp = xn + 4;
                let zp = xn + 5;
                if faces[xn] > 0 {
                    // L
                    add_color(
                        COLOR_LOOKUP[value][LEFT],
                        &mut colors,
                        get_other_index(x, y, z, MAP_LOOKUP[0]),
                        0.0,
                    );
                    add_color(
                        COLOR_LOOKUP[value][LEFT],
                        &mut colors,
                        get_other_index(x, y, z + 1, MAP_LOOKUP[1]),
                        0.05,
                    );
                    add_color(
                        COLOR_LOOKUP[value][LEFT],
                        &mut colors,
                        get_other_index(x, y + 1, z + 1, MAP_LOOKUP[2]),
                        -0.03,
                    );
                    add_color(
                        COLOR_LOOKUP[value][LEFT],
                        &mut colors,
                        get_other_index(x, y + 1, z, MAP_LOOKUP[3]),
                        -0.08,
                    );
                }
                if faces[yn] > 0 {
                    // D
                    add_color(
                        COLOR_LOOKUP[value][BOTTOM],
                        &mut colors,
                        get_other_index(x, y, z, MAP_LOOKUP[4]),
                        0.0,
                    );
                    add_color(
                        COLOR_LOOKUP[value][BOTTOM],
                        &mut colors,
                        get_other_index(x + 1, y, z, MAP_LOOKUP[5]),
                        0.05,
                    );
                    add_color(
                        COLOR_LOOKUP[value][BOTTOM],
                        &mut colors,
                        get_other_index(x + 1, y, z + 1, MAP_LOOKUP[6]),
                        -0.03,
                    );
                    add_color(
                        COLOR_LOOKUP[value][BOTTOM],
                        &mut colors,
                        get_other_index(x, y, z + 1, MAP_LOOKUP[7]),
                        -0.08,
                    );
                }
                if faces[zn] > 0 {
                    // B
                    add_color(
                        COLOR_LOOKUP[value][BACK],
                        &mut colors,
                        get_other_index(x, y, z, MAP_LOOKUP[8]),
                        0.0,
                    );
                    add_color(
                        COLOR_LOOKUP[value][BACK],
                        &mut colors,
                        get_other_index(x, y + 1, z, MAP_LOOKUP[9]),
                        0.05,
                    );
                    add_color(
                        COLOR_LOOKUP[value][BACK],
                        &mut colors,
                        get_other_index(x + 1, y + 1, z, MAP_LOOKUP[10]),
                        -0.03,
                    );
                    add_color(
                        COLOR_LOOKUP[value][BACK],
                        &mut colors,
                        get_other_index(x + 1, y, z, MAP_LOOKUP[11]),
                        -0.08,
                    );
                }
                if faces[xp] > 0 {
                    // R
                    add_color(
                        COLOR_LOOKUP[value][RIGHT],
                        &mut colors,
                        get_other_index(x + 1, y, z, MAP_LOOKUP[12]),
                        0.0,
                    );
                    add_color(
                        COLOR_LOOKUP[value][RIGHT],
                        &mut colors,
                        get_other_index(x + 1, y + 1, z, MAP_LOOKUP[13]),
                        0.05,
                    );
                    add_color(
                        COLOR_LOOKUP[value][RIGHT],
                        &mut colors,
                        get_other_index(x + 1, y + 1, z + 1, MAP_LOOKUP[14]),
                        -0.03,
                    );
                    add_color(
                        COLOR_LOOKUP[value][RIGHT],
                        &mut colors,
                        get_other_index(x + 1, y, z + 1, MAP_LOOKUP[15]),
                        -0.08,
                    );
                }
                if faces[yp] > 0 {
                    // U
                    add_color(
                        COLOR_LOOKUP[value][TOP],
                        &mut colors,
                        get_other_index(x, y + 1, z, MAP_LOOKUP[16]),
                        0.0,
                    );
                    add_color(
                        COLOR_LOOKUP[value][TOP],
                        &mut colors,
                        get_other_index(x, y + 1, z + 1, MAP_LOOKUP[17]),
                        0.05,
                    );
                    add_color(
                        COLOR_LOOKUP[value][TOP],
                        &mut colors,
                        get_other_index(x + 1, y + 1, z + 1, MAP_LOOKUP[18]),
                        -0.03,
                    );
                    add_color(
                        COLOR_LOOKUP[value][TOP],
                        &mut colors,
                        get_other_index(x + 1, y + 1, z, MAP_LOOKUP[19]),
                        -0.08,
                    );
                }
                if faces[zp] > 0 {
                    // F
                    add_color(
                        COLOR_LOOKUP[value][FRONT],
                        &mut colors,
                        get_other_index(x, y, z + 1, MAP_LOOKUP[20]),
                        0.0,
                    );
                    add_color(
                        COLOR_LOOKUP[value][FRONT],
                        &mut colors,
                        get_other_index(x + 1, y, z + 1, MAP_LOOKUP[21]),
                        0.05,
                    );
                    add_color(
                        COLOR_LOOKUP[value][FRONT],
                        &mut colors,
                        get_other_index(x + 1, y + 1, z + 1, MAP_LOOKUP[22]),
                        -0.03,
                    );
                    add_color(
                        COLOR_LOOKUP[value][FRONT],
                        &mut colors,
                        get_other_index(x, y + 1, z + 1, MAP_LOOKUP[23]),
                        -0.08,
                    );
                }
                index_raw += 1;
            }
        }
    }
    return colors;
}
