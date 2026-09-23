"""The campus as the player walks it.

Two jobs: give the player something ergonomic to explore, and count. Every call to
``neighbors`` is one node expanded, and that is the metric the game shows instead of time
(ADR 0011).
"""

from dataclasses import dataclass

_explored = 0


def reset_ops() -> None:
    global _explored
    _explored = 0


def ops_count() -> int:
    return _explored


@dataclass(frozen=True)
class Edge:
    """One path leaving a building, with the distance to walk it."""

    to: str
    weight: float


class Graph:
    def __init__(self, raw: dict) -> None:
        self._order: list[str] = []
        self._labels: dict[str, str] = {}
        self._adjacency: dict[str, list[Edge]] = {}

        for node in raw.get("nodes", []):
            self._order.append(node["id"])
            self._labels[node["id"]] = node["label"]
            self._adjacency[node["id"]] = []

        # Edges are undirected and declared once, so both directions are filled in here.
        for edge in raw.get("edges", []):
            self._adjacency.setdefault(edge["from"], []).append(Edge(edge["to"], edge["weight"]))
            self._adjacency.setdefault(edge["to"], []).append(Edge(edge["from"], edge["weight"]))

    def nodes(self) -> list[str]:
        """Every node id in the graph."""
        return self._order

    def neighbors(self, id: str) -> list[Edge]:
        """The edges leaving a node. Each call counts as one node explored."""
        global _explored
        _explored += 1
        return self._adjacency.get(id, [])

    def label(self, id: str) -> str:
        """The name a person reads, as opposed to the id an algorithm uses."""
        return self._labels.get(id, id)
