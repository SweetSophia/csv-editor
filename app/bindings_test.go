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
