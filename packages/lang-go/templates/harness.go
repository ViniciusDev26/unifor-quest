package main

import (
	"encoding/json"
	"fmt"
	"io"
	"os"
	"time"
)

// Replaced by the adapter with the nonce for this run (ADR 0006). A player who prints
// something envelope-shaped cannot forge a result.
const (
	beginMarker = "%%UQ_BEGIN%%"
	endMarker   = "%%UQ_END%%"
)

type harnessCase struct {
	Name  string            `json:"name"`
	Input []json.RawMessage `json:"input"`
}

type testResult struct {
	Name   string `json:"name"`
	Actual any    `json:"actual"`
	Ms     int64  `json:"ms"`
	Ops    int    `json:"ops"`
}

type envelope struct {
	Results      []testResult `json:"results"`
	PlayerStdout string       `json:"playerStdout"`
	Error        *string      `json:"error"`
}

// recoverInto turns a panic in the player's code into a failure, so the envelope still
// gets printed instead of the process dying silently.
func recoverInto(failure *error) {
	if recovered := recover(); recovered != nil {
		*failure = fmt.Errorf("%v", recovered)
	}
}

func argumentCountError(expected int, got int) error {
	return fmt.Errorf("esperava %d argumento(s), veio %d", expected, got)
}

// uq:begin invoke
//
// Everything between the markers is replaced by the adapter with the calling code for the
// challenge at hand: one decode per parameter, then the call. What is here is the version
// for `greet(name string) string`, which keeps this file compiling and puts the Go
// compiler in charge of checking the template on every build.

func invoke(c harnessCase) (result any, failure error) {
	defer recoverInto(&failure)

	if len(c.Input) != 1 {
		return nil, argumentCountError(1, len(c.Input))
	}

	var arg0 string
	if err := json.Unmarshal(c.Input[0], &arg0); err != nil {
		return nil, err
	}

	return greet(arg0), nil
}

// uq:end invoke

func main() {
	raw, err := io.ReadAll(os.Stdin)
	if err != nil {
		emitTo(os.Stdout, nil, "", err)
		return
	}

	var cases []harnessCase
	if err := json.Unmarshal(raw, &cases); err != nil {
		emitTo(os.Stdout, nil, "", err)
		return
	}

	// Anything the player prints goes to a pipe, so it cannot corrupt the envelope. It is
	// drained on a goroutine: a full pipe buffer would otherwise block the player's code.
	real := os.Stdout
	reader, writer, err := os.Pipe()
	if err != nil {
		emitTo(real, nil, "", err)
		return
	}
	os.Stdout = writer

	captured := make(chan string, 1)
	go func() {
		printed, _ := io.ReadAll(reader)
		captured <- string(printed)
	}()

	results := make([]testResult, 0, len(cases))
	var failure error

	for _, c := range cases {
		resetOps()
		started := time.Now()
		actual, err := invoke(c)
		results = append(results, testResult{
			Name:   c.Name,
			Actual: actual,
			Ms:     time.Since(started).Milliseconds(),
			Ops:    opsCount(),
		})
		if err != nil {
			failure = err
			break
		}
	}

	os.Stdout = real
	_ = writer.Close()
	playerStdout := <-captured

	emitTo(real, results, playerStdout, failure)
}

func emitTo(out *os.File, results []testResult, playerStdout string, failure error) {
	if results == nil {
		results = []testResult{}
	}

	var message *string
	if failure != nil {
		text := failure.Error()
		message = &text
	}

	payload, err := json.Marshal(envelope{Results: results, PlayerStdout: playerStdout, Error: message})
	if err != nil {
		payload = []byte(`{"results":[],"playerStdout":"","error":"nao foi possivel serializar o resultado"}`)
	}

	fmt.Fprint(out, beginMarker+string(payload)+endMarker)
}
