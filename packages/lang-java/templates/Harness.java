import java.io.ByteArrayOutputStream;
import java.io.PrintStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Reads the cases from stdin, runs them all in one execution, redirects whatever the player
 * printed and emits the envelope between the nonce markers (ADR 0006). It never decides
 * whether a case passed — that is the game's job (ADR 0037).
 *
 * Java runs this straight from source, with no compilation step of its own (ADR 0023), so
 * the player's file keeps its own line numbers in compiler errors.
 */
public class Harness {
    /** Replaced by the adapter with the nonce for this run. */
    private static final String BEGIN_MARKER = "%%UQ_BEGIN%%";
    private static final String END_MARKER = "%%UQ_END%%";

    public static void main(String[] args) throws Exception {
        String raw = new String(System.in.readAllBytes(), StandardCharsets.UTF_8);

        List<Object> cases;
        try {
            cases = Json.asList(Json.parse(raw), value -> value);
        } catch (RuntimeException cause) {
            emit(System.out, List.of(), "", message(cause));
            return;
        }

        // Anything the player prints goes to a buffer, so it cannot corrupt the envelope.
        PrintStream real = System.out;
        ByteArrayOutputStream printed = new ByteArrayOutputStream();
        System.setOut(new PrintStream(printed, true, StandardCharsets.UTF_8));

        List<Object> results = new ArrayList<>();
        String failure = null;

        try {
            for (Object entry : cases) {
                Map<String, Object> current = Json.asObject(entry);
                String name = Json.asString(current.get("name"));
                List<Object> input = Json.asList(current.get("input"), value -> value);

                Graph.resetOps();
                long startedAt = System.nanoTime();
                Object actual = null;
                try {
                    actual = invoke(input);
                } catch (Throwable cause) {
                    failure = message(cause);
                }

                results.add(result(name, actual, (System.nanoTime() - startedAt) / 1_000_000L));
                if (failure != null) {
                    break;
                }
            }
        } finally {
            System.setOut(real);
        }

        emit(real, results, printed.toString(StandardCharsets.UTF_8), failure);
    }

    private static Map<String, Object> result(String name, Object actual, long ms) {
        Map<String, Object> entry = new LinkedHashMap<>();
        entry.put("name", name);
        entry.put("actual", actual);
        entry.put("ms", ms);
        entry.put("ops", Graph.opsCount());
        return entry;
    }

    private static void emit(PrintStream out, List<Object> results, String printed, String failure) {
        Map<String, Object> envelope = new LinkedHashMap<>();
        envelope.put("results", results);
        envelope.put("playerStdout", printed);
        envelope.put("error", failure);
        out.print(BEGIN_MARKER + Json.write(envelope) + END_MARKER);
        out.flush();
    }

    /** An exception with no message would otherwise reach the player as an empty string. */
    private static String message(Throwable cause) {
        String text = cause.getMessage();
        return text == null || text.isBlank() ? cause.getClass().getSimpleName() : text;
    }

    private static IllegalArgumentException argumentCountError(int expected, int got) {
        return new IllegalArgumentException("esperava " + expected + " argumento(s), veio " + got);
    }

    // uq:begin invoke
    //
    // Everything between the markers is replaced by the adapter with the calling code for
    // the challenge at hand: one decode per parameter, then the call. What is here is the
    // version for `greet(String name)`, which keeps this file compiling and puts the Java
    // compiler in charge of checking the template on every build.

    private static Object invoke(List<Object> input) {
        if (input.size() != 1) {
            throw argumentCountError(1, input.size());
        }

        String arg0 = Json.asString(input.get(0));

        return Solution.greet(arg0);
    }

    // uq:end invoke
}
