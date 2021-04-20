package main

import (
	"log"
	"net/http"
	"os"
)

func main() {
	fs := http.FileServer(http.Dir("./"))
	http.Handle("/", fs)
	port := "3001"
	if len(os.Args) > 1 {
		port = os.Args[1]
	}
	log.Printf("Listening on :%s...\n", port)
	err := http.ListenAndServe(":"+port, nil)
	if err != nil {
		log.Fatal(err)
	}
}
