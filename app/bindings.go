package main

import "context"

// Bindings is the thin Wails binding layer.
// Business logic will be delegated to internal/ packages as features land.
type Bindings struct {
	ctx context.Context
}

func NewBindings() *Bindings {
	return &Bindings{}
}

func (b *Bindings) startup(ctx context.Context) {
	b.ctx = ctx
}

func (b *Bindings) shutdown(_ context.Context) {
}

// Version returns the build version (set via -ldflags at build time).
func (b *Bindings) Version() string {
	return version
}
