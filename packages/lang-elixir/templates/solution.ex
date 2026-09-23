# Stands in for the player's file so this folder runs on its own.
#
# The adapter replaces it with whatever the player wrote.

defmodule Solution do
  @moduledoc false

  @spec greet(name :: String.t()) :: String.t()
  def greet(name) do
    "Ola, #{name}!"
  end
end
