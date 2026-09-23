import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * The campus as the player walks it.
 *
 * Two jobs: give the player something ergonomic to explore, and count. Every call to
 * {@code neighbors} is one node expanded, and that is the metric the game shows instead of
 * time (ADR 0011).
 */
final class Graph {
    /** One path leaving a building, with the distance to walk it. */
    record Edge(String to, double weight) {}

    private static int explored = 0;

    static void resetOps() {
        explored = 0;
    }

    static int opsCount() {
        return explored;
    }

    private final List<String> order = new ArrayList<>();
    private final Map<String, String> labels = new LinkedHashMap<>();
    private final Map<String, List<Edge>> adjacency = new LinkedHashMap<>();

    /** Every node id in the graph. */
    List<String> nodes() {
        return order;
    }

    /** The edges leaving a node. Each call counts as one node explored. */
    List<Edge> neighbors(String id) {
        explored++;
        return adjacency.getOrDefault(id, List.of());
    }

    /** The name a person reads, as opposed to the id an algorithm uses. */
    String label(String id) {
        return labels.getOrDefault(id, id);
    }

    static Graph from(Object raw) {
        Graph graph = new Graph();
        Map<String, Object> source = Json.asObject(raw);

        for (Object entry : Json.asList(source.get("nodes"), value -> value)) {
            Map<String, Object> node = Json.asObject(entry);
            String id = Json.asString(node.get("id"));
            graph.order.add(id);
            graph.labels.put(id, Json.asString(node.get("label")));
            graph.adjacency.put(id, new ArrayList<>());
        }

        // Edges are undirected and declared once, so both directions are filled in here.
        for (Object entry : Json.asList(source.get("edges"), value -> value)) {
            Map<String, Object> edge = Json.asObject(entry);
            String from = Json.asString(edge.get("from"));
            String to = Json.asString(edge.get("to"));
            double weight = Json.asDouble(edge.get("weight"));

            graph.adjacency.computeIfAbsent(from, key -> new ArrayList<>()).add(new Edge(to, weight));
            graph.adjacency.computeIfAbsent(to, key -> new ArrayList<>()).add(new Edge(from, weight));
        }

        return graph;
    }
}
