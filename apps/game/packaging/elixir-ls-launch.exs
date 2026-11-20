# Starts ElixirLS from modules compiled when the game was packaged (ADR 0083), instead of
# the release's own launch.exs. That one runs Mix.install on every start, and Mix.install
# checks its git dependencies with `git`, fetches from Hex when anything looks stale and
# compiles the server on first use: none of which a player's machine can be assumed to
# have (no git on Windows, maybe no network, a minute of compiling).
#
# ELS_INSTALL: the ElixirLS release folder (for its installer.exs, which defines the quiet
# Mix shell); ELS_PREBUILT: the compiled `_build/dev/lib` from scripts/fetch-runtimes.mjs.
Application.put_env(:elixir, :ansi_enabled, false)
Code.eval_file(Path.join(System.fetch_env!("ELS_INSTALL"), "installer.exs"))

Mix.start()
# Nothing but JSON-RPC may reach standard output.
Mix.shell(ElixirLS.Shell.Quiet)

for ebin <- Path.wildcard(Path.join(System.fetch_env!("ELS_PREBUILT"), "*/ebin")) do
  Code.prepend_path(ebin)
end

ElixirLS.LanguageServer.main()
