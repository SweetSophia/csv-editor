package main

import (
	"os"
	"strings"
	"testing"
)

func TestReadFileBoundedRejectsOversizedContent(t *testing.T) {
	path := t.TempDir() + "/oversized.csv"
	if err := os.WriteFile(path, []byte("123456"), 0o600); err != nil {
		t.Fatalf("write fixture: %v", err)
	}

	_, err := readFileBounded(path, 5)
	if err == nil {
		t.Fatal("expected oversized file error")
	}
	if !strings.Contains(err.Error(), "file too large") {
		t.Fatalf("expected file too large error, got %v", err)
	}
}

func TestReadFileBoundedRejectsDirectory(t *testing.T) {
	_, err := readFileBounded(t.TempDir(), 5)
	if err == nil {
		t.Fatal("expected directory error")
	}
	if !strings.Contains(err.Error(), "is a directory") {
		t.Fatalf("expected directory error, got %v", err)
	}
}

func TestReadFileBounded(t *testing.T) {
	tmpDir := t.TempDir()

	tests := []struct {
		name       string
		path       string
		maxBytes   int64
		setup      func(string) error
		wantErr    bool
		wantErrMsg string
	}{
		{
			name:     "file exactly at maxBytes boundary succeeds",
			path:     tmpDir + "/exact_boundary.csv",
			maxBytes: 5,
			setup: func(path string) error {
				return os.WriteFile(path, []byte("12345"), 0o600)
			},
			wantErr: false,
		},
		{
			name:     "file slightly under limit succeeds",
			path:     tmpDir + "/under_limit.csv",
			maxBytes: 10,
			setup: func(path string) error {
				return os.WriteFile(path, []byte("123456789"), 0o600)
			},
			wantErr: false,
		},
		{
			name:       "non-existent file returns error",
			path:       tmpDir + "/nonexistent.csv",
			maxBytes:   100,
			setup:      func(string) error { return nil },
			wantErr:    true,
			wantErrMsg: "open",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if err := tt.setup(tt.path); err != nil {
				t.Fatalf("setup failed: %v", err)
			}

			_, err := readFileBounded(tt.path, tt.maxBytes)
			if tt.wantErr {
				if err == nil {
					t.Fatalf("expected error containing %q, got nil", tt.wantErrMsg)
				}
				if !strings.Contains(err.Error(), tt.wantErrMsg) {
					t.Fatalf("expected error containing %q, got %v", tt.wantErrMsg, err)
				}
			} else {
				if err != nil {
					t.Fatalf("unexpected error: %v", err)
				}
			}
		})
	}
}
