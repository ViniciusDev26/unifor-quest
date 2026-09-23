package main

import "encoding/json"

// Edge is one path leaving a building, with the distance to walk it.
type Edge struct {
	To     string  `json:"to"`
	Weight float64 `json:"weight"`
}

// Graph is the campus as the player walks it.
//
// It has two jobs: give the player something ergonomic to explore, and count. Every call to
// Neighbors is one node expanded, and that is the metric the game shows instead of time
// (ADR 0011).
type Graph struct {
	order     []string
	labels    map[string]string
	adjacency map[string][]Edge
}

var explored int

func resetOps() {
	explored = 0
}

func opsCount() int {
	return explored
}

// Nodes lists every node id in the graph.
func (g Graph) Nodes() []string {
	return g.order
}

// Neighbors gives the edges leaving a node. Each call counts as one node explored.
func (g Graph) Neighbors(id string) []Edge {
	explored++
	return g.adjacency[id]
}

// Label is the name a person reads, as opposed to the id an algorithm uses.
func (g Graph) Label(id string) string {
	if name, found := g.labels[id]; found {
		return name
	}
	return id
}

type rawGraph struct {
	Nodes []struct {
		ID    string `json:"id"`
		Label string `json:"label"`
	} `json:"nodes"`
	Edges []struct {
		From   string  `json:"from"`
		To     string  `json:"to"`
		Weight float64 `json:"weight"`
	} `json:"edges"`
}

func buildGraph(raw json.RawMessage) (Graph, error) {
	var source rawGraph
	if err := json.Unmarshal(raw, &source); err != nil {
		return Graph{}, err
	}

	graph := Graph{
		order:     make([]string, 0, len(source.Nodes)),
		labels:    make(map[string]string, len(source.Nodes)),
		adjacency: make(map[string][]Edge, len(source.Nodes)),
	}

	for _, node := range source.Nodes {
		graph.order = append(graph.order, node.ID)
		graph.labels[node.ID] = node.Label
		graph.adjacency[node.ID] = nil
	}

	// Edges are undirected and declared once, so both directions are filled in here.
	for _, edge := range source.Edges {
		graph.adjacency[edge.From] = append(graph.adjacency[edge.From], Edge{To: edge.To, Weight: edge.Weight})
		graph.adjacency[edge.To] = append(graph.adjacency[edge.To], Edge{To: edge.From, Weight: edge.Weight})
	}

	return graph, nil
}
