package main

// Stands in for the player's file so this package compiles on its own. The adapter
// replaces it with whatever the player wrote.
func greet(name string) string {
	return "Ola, " + name + "!"
}
