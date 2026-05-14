package main

import (
	"embed"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/mac"
)

var version = "dev"

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	bindings := NewBindings()

	err := wails.Run(&options.App{
		Title:                    "CSV Editor",
		Width:                    1280,
		Height:                   800,
		EnableDefaultContextMenu: true,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 250, G: 250, B: 250, A: 1},
		OnStartup:        bindings.startup,
		OnShutdown:       bindings.shutdown,
		Bind: []interface{}{
			bindings,
		},
		Mac: &mac.Options{
			TitleBar: &mac.TitleBar{
				TitlebarAppearsTransparent: true,
				HideTitle:                  false,
				FullSizeContent:            true,
			},
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}
