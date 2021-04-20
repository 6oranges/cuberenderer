## Building Rust

Normally just run `wasm-pack build --out-dir ../www/rust-rendering` from within rendering directory
the target directory can be removed, then to regenerate it run `wasm-pack build --out-dir ../www/rust-rendering --target web`

## Running a local web server

Go is used for a simple local http server setup, as I found that the default one in python sucked
To build the go server just run `go build` and the executable will be generated named project
It can be supplied a port number to run on though an additional argument to the command line
It will host everything in www/ which is the static hosting directory.

## Generating Icons

Icons are generated from https://realfavicongenerator.net/ and can all be regenerated there
though there were some options set around background colors and location of output files
