"""Runs the player's code and reports what it returned.

Reads the cases from stdin, runs them all in one execution, redirects whatever the player
printed and emits the envelope between the nonce markers (ADR 0006). It never decides
whether a case passed — that is the game's job (ADR 0037).

The player's code stays in its own file so tracebacks point at the editor's lines.
"""

import contextlib
import dataclasses
import io
import json
import sys
import time

import graph as graph_prelude
import solution

# Replaced by the adapter with the nonce for this run.
BEGIN_MARKER = "%%UQ_BEGIN%%"
END_MARKER = "%%UQ_END%%"


def argument_count_error(expected: int, got: int) -> ValueError:
    return ValueError(f"esperava {expected} argumento(s), veio {got}")


def encode(value: object) -> object:
    """Structs of the neutral type system arrive as dataclasses; JSON knows nothing of them."""
    if dataclasses.is_dataclass(value) and not isinstance(value, type):
        return dataclasses.asdict(value)
    raise TypeError(f"nao sei serializar {type(value).__name__}")


def emit(out, results: list, printed: str, failure: str | None) -> None:
    envelope = {"results": results, "playerStdout": printed, "error": failure}
    out.write(BEGIN_MARKER + json.dumps(envelope, default=encode) + END_MARKER)
    out.flush()


# uq:begin invoke
#
# Everything between the markers is replaced by the adapter with the call for the challenge
# at hand. What is here is the version for `greet(name: str) -> str`, which keeps this file
# runnable and lets the template be exercised on every build.


def invoke(arguments: list) -> object:
    if len(arguments) != 1:
        raise argument_count_error(1, len(arguments))

    return solution.greet(arguments[0])


# uq:end invoke


def main() -> None:
    real = sys.stdout

    try:
        cases = json.loads(sys.stdin.read())
    except ValueError as cause:
        emit(real, [], "", str(cause))
        return

    results = []
    failure = None
    printed = io.StringIO()

    # Anything the player prints goes to a buffer, so it cannot corrupt the envelope.
    with contextlib.redirect_stdout(printed):
        for case in cases:
            graph_prelude.reset_ops()
            started_at = time.perf_counter()
            actual = None
            try:
                actual = invoke(case["input"])
            except BaseException as cause:  # noqa: BLE001 - o jogador pode levantar qualquer coisa
                failure = str(cause) or type(cause).__name__

            results.append(
                {
                    "name": case["name"],
                    "actual": actual,
                    "ms": round((time.perf_counter() - started_at) * 1000),
                    "ops": graph_prelude.ops_count(),
                }
            )

            if failure is not None:
                break

    emit(real, results, printed.getvalue(), failure)


main()
