package config

import (
	"reflect"
	"testing"
)

func TestAddRecent(t *testing.T) {
	tests := []struct {
		name    string
		initial []string
		add     string
		want    []string
	}{
		{"empty", nil, "/a", []string{"/a"}},
		{"prepend new", []string{"/b", "/c"}, "/a", []string{"/a", "/b", "/c"}},
		{
			"move existing to front",
			[]string{"/a", "/b", "/c"},
			"/c",
			[]string{"/c", "/a", "/b"},
		},
		{
			"caps at 10",
			[]string{"/0", "/1", "/2", "/3", "/4", "/5", "/6", "/7", "/8", "/9"},
			"/x",
			[]string{"/x", "/0", "/1", "/2", "/3", "/4", "/5", "/6", "/7", "/8"},
		},
		{"empty path is no-op", []string{"/a"}, "", []string{"/a"}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			c := &Config{RecentFiles: append([]string(nil), tt.initial...)}
			c.AddRecent(tt.add)
			if !reflect.DeepEqual(c.RecentFiles, tt.want) {
				t.Errorf("AddRecent = %v, want %v", c.RecentFiles, tt.want)
			}
		})
	}
}
