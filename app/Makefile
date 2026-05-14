VERSION ?= $(shell git describe --tags --always --dirty 2>/dev/null || echo "dev")
LDFLAGS := -X 'main.version=$(VERSION)'

.PHONY: build build-all dev test clean

build:
	wails build -ldflags "$(LDFLAGS)"
	mkdir -p dist
	cp -r build/bin/csv-editor.app dist/ 2>/dev/null || true
	cp build/bin/csv-editor.exe dist/ 2>/dev/null || true

build-all: build

dev:
	wails dev

test:
	go test ./...

clean:
	rm -rf build/bin dist
