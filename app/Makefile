APP     := csv-editor
VERSION ?= $(shell git describe --tags --always --dirty 2>/dev/null || echo "dev")
LDFLAGS := -X 'main.version=$(VERSION)'
UNAME_S := $(shell uname -s)
LINUX_GOOS ?= $(shell go env GOOS)
LINUX_GOARCH ?= $(shell go env GOARCH)
LINUX_ARTIFACT_SUFFIX := $(LINUX_GOOS)-$(LINUX_GOARCH)

ifeq ($(UNAME_S),Linux)
WAILS_TAGS ?= webkit2_41
endif

WAILS_BUILD_FLAGS := -ldflags "$(LDFLAGS)"
ifneq ($(strip $(WAILS_TAGS)),)
WAILS_BUILD_FLAGS += -tags "$(WAILS_TAGS)"
endif

# macOS Developer ID signing / notarization (see nlink-jp/.github
# CONVENTIONS.md §Code Signing → Wails / GUI apps). Defaults match
# any Developer ID Application cert in the keychain and the
# org-standard notary profile. Builds without these fall back to
# whatever signature `wails build` emitted (typically ad-hoc) with
# a one-line warning from the scripts.
CODESIGN_IDENTITY ?= Developer ID Application
NOTARY_PROFILE    ?= nlink-jp-notary
ENTITLEMENTS      ?= ../scripts/entitlements.plist

CODESIGN_SCRIPT := ../scripts/codesign-darwin-app.sh
NOTARIZE_SCRIPT := ../scripts/notarize-darwin-app.sh

.PHONY: build build-all package dev test clean

build:
	wails build $(WAILS_BUILD_FLAGS)
	@if [ -d build/bin/$(APP).app ]; then \
		$(CODESIGN_SCRIPT) build/bin/$(APP).app "$(CODESIGN_IDENTITY)" "$(ENTITLEMENTS)"; \
	fi
	mkdir -p dist
	# macOS preserves extended attributes (incl. code-sign
	# resources) via ditto, not cp -r. With cp -r the signature is
	# stripped and the launched binary aborts at startup with
	# "SIGKILL (Code Signature Invalid)" until manually re-signed.
	@if [ -d build/bin/$(APP).app ]; then \
		rm -rf dist/$(APP).app; \
		ditto build/bin/$(APP).app dist/$(APP).app; \
	fi
	@if [ -f build/bin/$(APP).exe ]; then \
		cp build/bin/$(APP).exe dist/; \
	fi
	@if [ -f build/bin/$(APP) ]; then \
		cp build/bin/$(APP) dist/; \
	fi

build-all: build

## package: build, notarize the darwin .app (staples the ticket),
## then zip the now-stapled bundle for upload to GitHub Releases.
## Windows .exe is zipped as-is (no signing for Windows yet).
package: build
	@if [ -d dist/$(APP).app ]; then \
		$(NOTARIZE_SCRIPT) dist/$(APP).app "$(NOTARY_PROFILE)"; \
		cd dist && /usr/bin/ditto -c -k --keepParent $(APP).app $(APP)-$(VERSION)-darwin.zip; \
	fi
	@if [ -f dist/$(APP).exe ]; then \
		cd dist && zip $(APP)-$(VERSION)-windows.zip $(APP).exe; \
	fi
	@if [ -f dist/$(APP) ]; then \
		cd dist && tar -czf $(APP)-$(VERSION)-$(LINUX_ARTIFACT_SUFFIX).tar.gz $(APP); \
	fi
	@ls -la dist/*.zip dist/*.tar.gz 2>/dev/null || true

dev:
	wails dev

test:
	go test ./...

clean:
	rm -rf build/bin dist
