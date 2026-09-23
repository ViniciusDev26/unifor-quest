# Runs the player's code and reports what it returned.
#
# Reads the cases from stdin, runs them all in one execution, redirects whatever the player
# printed and emits the envelope between the nonce markers (ADR 0006). It never decides
# whether a case passed — that is the game's job (ADR 0037).
#
# The player's code stays in its own file so errors point at the editor's lines. Elixir has
# no `require` for compiled modules across files in script mode, so both files are pulled in
# by hand, in order — the prelude first, since the player's code may reference it.

Code.require_file("graph.ex", __DIR__)
Code.require_file("solution.ex", __DIR__)

defmodule Harness do
  @moduledoc false

  # Replaced by the adapter with the nonce for this run.
  @begin_marker "%%UQ_BEGIN%%"
  @end_marker "%%UQ_END%%"

  def argument_count_error(expected, got) do
    "esperava #{expected} argumento(s), veio #{got}"
  end

  # Structs of the neutral type system arrive as `defstruct`s; the JSON module knows nothing
  # of them, so every value is walked once on the way out.
  defp to_json_safe(value) when is_struct(value) do
    value |> Map.from_struct() |> to_json_safe()
  end

  defp to_json_safe(value) when is_map(value) do
    Map.new(value, fn {k, v} -> {k, to_json_safe(v)} end)
  end

  defp to_json_safe(value) when is_list(value) do
    Enum.map(value, &to_json_safe/1)
  end

  defp to_json_safe(value), do: value

  defp emit(results, printed, failure) do
    envelope = %{results: results, playerStdout: printed, error: failure}
    IO.write(@begin_marker <> JSON.encode!(to_json_safe(envelope)) <> @end_marker)
  end

  # uq:begin invoke
  #
  # Everything between the markers is replaced by the adapter with the call for the challenge
  # at hand. What is here is the version for `greet(name)`, which keeps this file runnable
  # and lets the template be exercised on every build.

  def invoke(arguments) do
    if length(arguments) != 1 do
      raise argument_count_error(1, length(arguments))
    end

    Solution.greet(Enum.at(arguments, 0))
  end

  # uq:end invoke

  defp run_case(case_data) do
    Graph.reset_ops()
    started_at = System.monotonic_time(:microsecond)

    # The player's code can raise or throw anything at all — the harness runs one case, not
    # a test suite, and whatever stops it is the failure the game reports.
    outcome =
      try do
        {:ok, invoke(case_data["input"])}
      rescue
        e -> {:error, Exception.message(e)}
      catch
        kind, reason -> {:error, "#{kind}: #{inspect(reason)}"}
      end

    ms = round((System.monotonic_time(:microsecond) - started_at) / 1000)
    ops = Graph.ops_count()

    case outcome do
      {:ok, value} -> {:ok, %{name: case_data["name"], actual: value, ms: ms, ops: ops}}
      {:error, message} -> {:error, message}
    end
  end

  defp run_cases(cases) do
    Enum.reduce_while(cases, {[], nil}, fn case_data, {acc, _} ->
      case run_case(case_data) do
        {:ok, result} -> {:cont, {[result | acc], nil}}
        {:error, message} -> {:halt, {acc, message}}
      end
    end)
  end

  def main do
    input = IO.read(:stdio, :eof)

    # Anything the player prints goes to a buffer, so it cannot corrupt the envelope. The
    # group leader has to be swapped back before stdin is read again or the envelope is
    # written — both go to the real one.
    {:ok, capture} = StringIO.open("")
    original_leader = Process.group_leader()
    Process.group_leader(self(), capture)

    {results, failure} =
      case JSON.decode(input) do
        {:ok, cases} -> run_cases(cases)
        {:error, reason} -> {[], inspect(reason)}
      end

    Process.group_leader(self(), original_leader)
    {:ok, {_in, printed}} = StringIO.close(capture)

    emit(Enum.reverse(results), printed, failure)
  end
end

Harness.main()
