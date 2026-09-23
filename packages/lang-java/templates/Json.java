import java.lang.reflect.RecordComponent;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;

/**
 * The JSON the harness needs, and nothing more.
 *
 * Java has no JSON in its standard library, and the game refuses to make the player install
 * anything (ADR 0046). So this is written out: a recursive descent parser and a writer,
 * enough for what crosses the boundary — null, booleans, numbers, strings, lists and
 * objects (ADR 0004).
 *
 * Parsed values are plain Java: null, Boolean, Long, Double, String, List<Object> and
 * Map<String, Object>.
 */
final class Json {
    private final String source;
    private int at;

    private Json(String source) {
        this.source = source;
        this.at = 0;
    }

    static Object parse(String source) {
        Json reader = new Json(source);
        reader.skipBlanks();
        Object value = reader.readValue();
        reader.skipBlanks();
        if (reader.at != source.length()) {
            throw new IllegalArgumentException("sobrou conteudo depois do JSON");
        }
        return value;
    }

    private Object readValue() {
        char current = peek();
        return switch (current) {
            case '{' -> readObject();
            case '[' -> readArray();
            case '"' -> readString();
            case 't', 'f' -> readBoolean();
            case 'n' -> readNull();
            default -> readNumber();
        };
    }

    private Map<String, Object> readObject() {
        expect('{');
        Map<String, Object> entries = new LinkedHashMap<>();
        skipBlanks();
        if (peek() == '}') {
            at++;
            return entries;
        }
        while (true) {
            skipBlanks();
            String key = readString();
            skipBlanks();
            expect(':');
            skipBlanks();
            entries.put(key, readValue());
            skipBlanks();
            char next = next();
            if (next == '}') {
                return entries;
            }
            if (next != ',') {
                throw new IllegalArgumentException("esperava , ou } no objeto");
            }
        }
    }

    private List<Object> readArray() {
        expect('[');
        List<Object> items = new ArrayList<>();
        skipBlanks();
        if (peek() == ']') {
            at++;
            return items;
        }
        while (true) {
            skipBlanks();
            items.add(readValue());
            skipBlanks();
            char next = next();
            if (next == ']') {
                return items;
            }
            if (next != ',') {
                throw new IllegalArgumentException("esperava , ou ] na lista");
            }
        }
    }

    private String readString() {
        expect('"');
        StringBuilder text = new StringBuilder();
        while (true) {
            char current = next();
            if (current == '"') {
                return text.toString();
            }
            if (current != '\\') {
                text.append(current);
                continue;
            }
            char escaped = next();
            switch (escaped) {
                case '"', '\\', '/' -> text.append(escaped);
                case 'b' -> text.append('\b');
                case 'f' -> text.append('\f');
                case 'n' -> text.append('\n');
                case 'r' -> text.append('\r');
                case 't' -> text.append('\t');
                case 'u' -> {
                    text.append((char) Integer.parseInt(source.substring(at, at + 4), 16));
                    at += 4;
                }
                default -> throw new IllegalArgumentException("escape desconhecido: " + escaped);
            }
        }
    }

    private Object readBoolean() {
        if (source.startsWith("true", at)) {
            at += 4;
            return Boolean.TRUE;
        }
        if (source.startsWith("false", at)) {
            at += 5;
            return Boolean.FALSE;
        }
        throw new IllegalArgumentException("booleano invalido");
    }

    private Object readNull() {
        if (!source.startsWith("null", at)) {
            throw new IllegalArgumentException("esperava null");
        }
        at += 4;
        return null;
    }

    /** Whole numbers come back as Long and the rest as Double, like the other adapters. */
    private Object readNumber() {
        int start = at;
        while (at < source.length() && "+-.eE0123456789".indexOf(source.charAt(at)) >= 0) {
            at++;
        }
        String text = source.substring(start, at);
        if (text.indexOf('.') < 0 && text.indexOf('e') < 0 && text.indexOf('E') < 0) {
            return Long.parseLong(text);
        }
        return Double.parseDouble(text);
    }

    private void skipBlanks() {
        while (at < source.length() && Character.isWhitespace(source.charAt(at))) {
            at++;
        }
    }

    private char peek() {
        if (at >= source.length()) {
            throw new IllegalArgumentException("JSON terminou antes da hora");
        }
        return source.charAt(at);
    }

    private char next() {
        char current = peek();
        at++;
        return current;
    }

    private void expect(char expected) {
        if (next() != expected) {
            throw new IllegalArgumentException("esperava " + expected);
        }
    }

    // --- escrita ---

    static String write(Object value) {
        StringBuilder out = new StringBuilder();
        writeInto(out, value);
        return out.toString();
    }

    private static void writeInto(StringBuilder out, Object value) {
        switch (value) {
            case null -> out.append("null");
            case String text -> writeString(out, text);
            case Boolean flag -> out.append(flag.toString());
            case Number number -> out.append(writeNumber(number));
            case Map<?, ?> entries -> {
                out.append('{');
                boolean first = true;
                for (Map.Entry<?, ?> entry : entries.entrySet()) {
                    if (!first) {
                        out.append(',');
                    }
                    first = false;
                    writeString(out, String.valueOf(entry.getKey()));
                    out.append(':');
                    writeInto(out, entry.getValue());
                }
                out.append('}');
            }
            case Iterable<?> items -> {
                out.append('[');
                boolean first = true;
                for (Object item : items) {
                    if (!first) {
                        out.append(',');
                    }
                    first = false;
                    writeInto(out, item);
                }
                out.append(']');
            }
            case Object other when other.getClass().isRecord() -> writeRecord(out, other);
            default -> writeString(out, String.valueOf(value));
        }
    }

    /** A struct of the neutral type system becomes a record, written by its components. */
    private static void writeRecord(StringBuilder out, Object record) {
        out.append('{');
        RecordComponent[] components = record.getClass().getRecordComponents();
        for (int index = 0; index < components.length; index++) {
            if (index > 0) {
                out.append(',');
            }
            writeString(out, components[index].getName());
            out.append(':');
            try {
                writeInto(out, components[index].getAccessor().invoke(record));
            } catch (ReflectiveOperationException cause) {
                throw new IllegalStateException(cause);
            }
        }
        out.append('}');
    }

    private static String writeNumber(Number number) {
        if (number instanceof Double value && value == Math.floor(value) && !value.isInfinite()) {
            return String.valueOf(value.longValue());
        }
        return number.toString();
    }

    private static void writeString(StringBuilder out, String text) {
        out.append('"');
        for (int index = 0; index < text.length(); index++) {
            char current = text.charAt(index);
            switch (current) {
                case '"' -> out.append("\\\"");
                case '\\' -> out.append("\\\\");
                case '\n' -> out.append("\\n");
                case '\r' -> out.append("\\r");
                case '\t' -> out.append("\\t");
                default -> {
                    if (current < 0x20) {
                        out.append(String.format("\\u%04x", (int) current));
                    } else {
                        out.append(current);
                    }
                }
            }
        }
        out.append('"');
    }

    // --- conversao para os tipos do desafio ---

    static String asString(Object value) {
        return value == null ? null : (String) value;
    }

    static int asInt(Object value) {
        return (int) ((Number) value).longValue();
    }

    static Integer asBoxedInt(Object value) {
        return value == null ? null : asInt(value);
    }

    static double asDouble(Object value) {
        return ((Number) value).doubleValue();
    }

    static Double asBoxedDouble(Object value) {
        return value == null ? null : asDouble(value);
    }

    static boolean asBoolean(Object value) {
        return (Boolean) value;
    }

    static Boolean asBoxedBoolean(Object value) {
        return value == null ? null : asBoolean(value);
    }

    @SuppressWarnings("unchecked")
    static <T> List<T> asList(Object value, Function<Object, T> each) {
        if (value == null) {
            return null;
        }
        List<T> items = new ArrayList<>();
        for (Object item : (List<Object>) value) {
            items.add(each.apply(item));
        }
        return items;
    }

    @SuppressWarnings("unchecked")
    static <T> Map<String, T> asMap(Object value, Function<Object, T> each) {
        if (value == null) {
            return null;
        }
        Map<String, T> entries = new LinkedHashMap<>();
        for (Map.Entry<String, Object> entry : ((Map<String, Object>) value).entrySet()) {
            entries.put(entry.getKey(), each.apply(entry.getValue()));
        }
        return entries;
    }

    @SuppressWarnings("unchecked")
    static Map<String, Object> asObject(Object value) {
        return (Map<String, Object>) value;
    }

    static <T> T asNullable(Object value, Function<Object, T> present) {
        return value == null ? null : present.apply(value);
    }
}
