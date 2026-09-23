defmodule Edge do
  @moduledoc false

  @enforce_keys [:to, :weight]
  defstruct [:to, :weight]

  @type t :: %__MODULE__{to: String.t(), weight: float()}
end

defmodule Graph do
  @moduledoc """
  The campus as the player walks it.

  Two jobs: give the player something ergonomic to explore, and count. Every call to
  `neighbors/2` is one node expanded, and that is the metric the game shows instead of time
  (ADR 0011).

  The counter lives in the process dictionary. The BEAM has no mutable global, and this is
  the idiomatic way to keep one hidden inside a single process without it leaking into the
  player's own function signature.
  """

  @enforce_keys [:order, :labels, :adjacency]
  defstruct [:order, :labels, :adjacency]

  @type t :: %__MODULE__{
          order: [String.t()],
          labels: %{String.t() => String.t()},
          adjacency: %{String.t() => [Edge.t()]}
        }

  @ops_key :uq_graph_ops

  @spec reset_ops() :: :ok
  def reset_ops do
    Process.put(@ops_key, 0)
    :ok
  end

  @spec ops_count() :: non_neg_integer()
  def ops_count do
    Process.get(@ops_key, 0)
  end

  @spec new(map()) :: t()
  def new(raw) do
    nodes = Map.get(raw, "nodes", [])
    edges = Map.get(raw, "edges", [])

    order = Enum.map(nodes, & &1["id"])
    labels = Map.new(nodes, &{&1["id"], &1["label"]})

    # Edges are undirected and declared once, so both directions are filled in here.
    adjacency =
      Enum.reduce(edges, Map.new(order, &{&1, []}), fn edge, acc ->
        from = edge["from"]
        to = edge["to"]
        weight = edge["weight"]

        acc
        |> Map.update(from, [%Edge{to: to, weight: weight}], &(&1 ++ [%Edge{to: to, weight: weight}]))
        |> Map.update(to, [%Edge{to: from, weight: weight}], &(&1 ++ [%Edge{to: from, weight: weight}]))
      end)

    %__MODULE__{order: order, labels: labels, adjacency: adjacency}
  end

  @spec nodes(t()) :: [String.t()]
  def nodes(%__MODULE__{order: order}), do: order

  @spec neighbors(t(), String.t()) :: [Edge.t()]
  def neighbors(%__MODULE__{adjacency: adjacency}, id) do
    Process.put(@ops_key, ops_count() + 1)
    Map.get(adjacency, id, [])
  end

  @spec label(t(), String.t()) :: String.t()
  def label(%__MODULE__{labels: labels}, id), do: Map.get(labels, id, id)
end
