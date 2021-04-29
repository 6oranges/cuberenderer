## cuberenderer

Cuberenderer renders cubes in a procedurally generated 'infinite' space using cube chunks
of blocks. The cube chunks are sent to rust to create the buffers(vertex&color) for use in webgl to
draw them. Rust also removes the extra faces while doing this.
The world is persistant because it is stored in localStorage api.

## controls

When playing the game, the keys WASD allow you to move around. Shift is down, Space is up. Double space
changes if you are flying or not. Holding control makes you go faster. Pressing R toggles rapid mode
where placing and removal of blocks is instant. Pressing K saves the world to a json file. Pressing L
lets you load a world from a json file. Left click destroys while right click places blocks. Middle
click selects a block which is then shown in the circle in the center of the screen. Scrolling switches
the current selected block.
A quick note, control is a modifier key, if playing with browser ui then control-W closes the tab. Make
sure to install and run as a PWA first or enter fullscreen to prevent this.
On mobile, currently moving consists of invisible buttons in calculated positions of the screen. The bottom
left corner controls movement like a joystick. Top left prompts for install if not installed. Top right
switches current block. Bottom right destroys blocks. Just above bottom right places blocks.

## Building Rust

The first time run `wasm-pack build --out-dir ../www/rust-rendering --target web` to regenerate target directory
Normally just run `wasm-pack build --out-dir ../www/rust-rendering` from within rendering directory

## Running a local web server

Go is used for a simple local http server setup, as I found that the default one in python sucked
To build the go server just run `go build` and the executable will be generated named project
It can be supplied a port number to run on though an additional argument to the command line
It will host everything in www/ which is the static hosting directory.

## Generating Icons

Icons are generated from https://realfavicongenerator.net/ and can all be regenerated there
though there were some options set around background colors and location of output files.
Specifically instead of hosting the icons in root, I change that to `./icons` so that I can
host this project in a subdirectory of a site. The icons are generated off of `visual_help/icon.png`
which is simply a screenshot of the blocks in game with the background removed.
