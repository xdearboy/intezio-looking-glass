package main

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/exec"
	"regexp"
	"strings"
	"time"
)

type ExecuteRequest struct {
	Command string `json:"command"`
	Target  string `json:"target"`
}

var allowedCommands = map[string]bool{
	"ping":        true,
	"traceroute":  true,
	"mtr":         true,
	"whois":       true,
}

var sem = make(chan struct{}, 10)

var (
	ipv4Re   = regexp.MustCompile(`^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$`)
	domainRe = regexp.MustCompile(`^[a-zA-Z0-9][a-zA-Z0-9\-]{0,61}[a-zA-Z0-9]?(\.[a-zA-Z]{2,})+$`)
)

const shellMetachars = ";& |`$(){}[]<>"

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func authMiddleware(secret string, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		token, found := strings.CutPrefix(authHeader, "Bearer ")
		if !found || token != secret {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
			return
		}
		next(w, r)
	}
}

func validateTarget(target string) bool {
	for _, ch := range shellMetachars {
		if strings.ContainsRune(target, ch) {
			return false
		}
	}
	return ipv4Re.MatchString(target) || domainRe.MatchString(target)
}

type DonePayload struct {
	ExitCode int    `json:"exit_code"`
	Error    string `json:"error,omitempty"`
}

func buildCommand(command, target string) (*exec.Cmd, *exec.Cmd) {
	switch command {
	case "ping":
		return exec.Command("ping", "-c", "4", "-i", "0.2", target), nil
	case "traceroute":
		return exec.Command("traceroute", "-m", "30", "-w", "3", target), nil
	case "mtr":
		return exec.Command("mtr", "-T", "-r", "-c", "10", target), nil
	case "whois":
		return exec.Command("whois", target), nil
	}
	return nil, nil
}

func handleExecute(w http.ResponseWriter, r *http.Request) {
	select {
	case sem <- struct{}{}:
		defer func() { <-sem }()
	default:
		writeJSON(w, http.StatusTooManyRequests, map[string]string{"error": "too many concurrent requests"})
		return
	}

	log.Printf("POST /execute from %s", r.RemoteAddr)
	var req ExecuteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Command == "" || req.Target == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "command and target are required"})
		return
	}

	if !allowedCommands[req.Command] {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "unknown command"})
		return
	}

	if !validateTarget(req.Target) {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid target"})
		return
	}

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "streaming not supported", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("X-Accel-Buffering", "no")
	w.WriteHeader(http.StatusOK)

	sendEvent := func(event, data string) {
		fmt.Fprintf(w, "event: %s\ndata: %s\n\n", event, data)
		flusher.Flush()
	}

	cmd1, cmd2 := buildCommand(req.Command, req.Target)

	var stdoutReader *bufio.Scanner
	var stderrBuf bytes.Buffer

	if cmd2 != nil {
		pipe, err := cmd1.StdoutPipe()
		if err != nil {
			sendEvent("done", `{"exit_code": 1, "error": "failed to create pipe"}`)
			return
		}
		cmd2.Stdin = pipe
		cmd2.Stderr = &stderrBuf

		outPipe, err := cmd2.StdoutPipe()
		if err != nil {
			sendEvent("done", `{"exit_code": 1, "error": "failed to create stdout pipe"}`)
			return
		}

		if err := cmd1.Start(); err != nil {
			sendEvent("done", fmt.Sprintf(`{"exit_code": 1, "error": %q}`, err.Error()))
			return
		}
		if err := cmd2.Start(); err != nil {
			sendEvent("done", fmt.Sprintf(`{"exit_code": 1, "error": %q}`, err.Error()))
			return
		}

		stdoutReader = bufio.NewScanner(outPipe)
		for stdoutReader.Scan() {
			sendEvent("output", stdoutReader.Text())
		}

		cmd1.Wait()
		if err := cmd2.Wait(); err != nil {
			exitCode := 1
			if exitErr, ok := err.(*exec.ExitError); ok {
				exitCode = exitErr.ExitCode()
			}
			payload, _ := json.Marshal(DonePayload{ExitCode: exitCode, Error: strings.TrimSpace(stderrBuf.String())})
			sendEvent("done", string(payload))
			return
		}
	} else {
		cmd1.Stderr = &stderrBuf
		outPipe, err := cmd1.StdoutPipe()
		if err != nil {
			sendEvent("done", `{"exit_code": 1, "error": "failed to create stdout pipe"}`)
			return
		}

		if err := cmd1.Start(); err != nil {
			sendEvent("done", fmt.Sprintf(`{"exit_code": 1, "error": %q}`, err.Error()))
			return
		}

		stdoutReader = bufio.NewScanner(outPipe)
		for stdoutReader.Scan() {
			sendEvent("output", stdoutReader.Text())
		}

		if err := cmd1.Wait(); err != nil {
			exitCode := 1
			if exitErr, ok := err.(*exec.ExitError); ok {
				exitCode = exitErr.ExitCode()
			}
			payload, _ := json.Marshal(DonePayload{ExitCode: exitCode, Error: strings.TrimSpace(stderrBuf.String())})
			sendEvent("done", string(payload))
			return
		}
	}

	sendEvent("done", `{"exit_code": 0}`)
}

func main() {
	secret := os.Getenv("AGENT_SECRET")
	if secret == "" {
		log.Fatal("AGENT_SECRET environment variable is not set")
	}

	port := os.Getenv("AGENT_PORT")
	if port == "" {
		port = "8080"
	}

	go func() {
		for {
			exec.Command("ping", "-c", "1", "-W", "1", "1.1.1.1").Run()
			time.Sleep(30 * time.Second)
		}
	}()

	go func() {
		for {
			exec.Command("iperf3", "-s", "-p", "5201").Run()
			time.Sleep(time.Second)
		}
	}()

	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", handleHealth)
	mux.HandleFunc("GET /testfile", handleTestfile)
	mux.HandleFunc("OPTIONS /testfile", handleTestfile)
	mux.HandleFunc("POST /execute", authMiddleware(secret, handleExecute))

	addr := fmt.Sprintf(":%s", port)
	log.Printf("Starting agent on %s", addr)
	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatalf("Server error: %v", err)
	}
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

func handleTestfile(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}

	sizeParam := r.URL.Query().Get("size")
	var size int64
	switch sizeParam {
	case "100":
		size = 100 * 1024 * 1024
	case "1000":
		size = 1000 * 1024 * 1024
	case "10000":
		size = 10000 * 1024 * 1024
	default:
		http.Error(w, "invalid size", http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/octet-stream")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%sMB.bin\"", sizeParam))
	w.Header().Set("Content-Length", fmt.Sprintf("%d", size))

	buf := make([]byte, 64*1024)
	var written int64
	for written < size {
		chunk := int64(len(buf))
		if written+chunk > size {
			chunk = size - written
		}
		n, err := w.Write(buf[:chunk])
		if err != nil {
			return
		}
		written += int64(n)
	}
}
