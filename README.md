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
