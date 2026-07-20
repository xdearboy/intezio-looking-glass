package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"
)

type NodeConfig struct {
	ID     string `json:"id"`
	Name   string `json:"name"`
	URL    string `json:"url"`
	Secret string `json:"secret"`
}

var nodes []NodeConfig

var httpClient = &http.Client{
	Timeout: 3600 * time.Second,
	Transport: &http.Transport{
		MaxIdleConns:        100,
		MaxIdleConnsPerHost: 100,
		IdleConnTimeout:     90 * time.Second,
		DisableCompression:  true,
		DisableKeepAlives:   false,
	},
}

func main() {
	raw := os.Getenv("NODES_CONFIG")
	if raw != "" {
		if err := json.Unmarshal([]byte(raw), &nodes); err != nil {
			log.Fatalf("NODES_CONFIG parse error: %v", err)
		}
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	mux := http.NewServeMux()
	mux.HandleFunc("POST /api/execute", withLogging(handleExecute))
	mux.HandleFunc("GET /api/client-ip", withLogging(handleClientIP))
	mux.HandleFunc("POST /api/set-locale", withLogging(handleSetLocale))
	mux.HandleFunc("GET /api/testfile", withLogging(handleTestfile))
	mux.HandleFunc("GET /api/health", withLogging(handleHealth))

	server := &http.Server{
		Addr:              ":" + port,
		Handler:           mux,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      3600 * time.Second,
		IdleTimeout:       120 * time.Second,
		ReadHeaderTimeout: 5 * time.Second,
		MaxHeaderBytes:    1 << 20, 
	}

	log.Printf("proxy listening on :%s", port)
	if err := server.ListenAndServe(); err != nil {
		log.Fatal(err)
	}
}

func handleExecute(w http.ResponseWriter, r *http.Request) {
	if len(nodes) == 0 {
		writeJSON(w, 500, map[string]string{"error": "nodes not configured"})
		return
	}

	var body struct {
		Command string `json:"command"`
		Target  string `json:"target"`
		Node    string `json:"node"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, 400, map[string]string{"error": "invalid request"})
		return
	}

	node := findNode(body.Node)
	if node == nil {
		writeJSON(w, 500, map[string]string{"error": "nodes not configured"})
		return
	}

	payload := mustJSON(map[string]string{
		"command": body.Command,
		"target":  body.Target,
	})

	req, err := http.NewRequestWithContext(r.Context(), "POST",
		node.URL+"/execute",
		strings.NewReader(payload),
	)
	if err != nil {
		writeJSON(w, 500, map[string]string{"error": "internal error"})
		return
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+node.Secret)

	resp, err := httpClient.Do(req)
	if err != nil {
		writeJSON(w, 502, map[string]string{"error": "agent unreachable"})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		var errBody map[string]string
		json.NewDecoder(resp.Body).Decode(&errBody)
		msg := errBody["error"]
		if msg == "" {
			msg = resp.Status
		}
		writeJSON(w, 502, map[string]string{"error": "agent error: " + msg})
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("X-Accel-Buffering", "no")
	w.WriteHeader(200)

	io.Copy(w, resp.Body)
}

func handleClientIP(w http.ResponseWriter, r *http.Request) {
	ip := extractClientIP(r)
	w.Header().Set("Cache-Control", "public, max-age=60")
	writeJSON(w, 200, map[string]string{"ip": ip})
}

func extractClientIP(r *http.Request) string {
	if fwd := r.Header.Get("X-Forwarded-For"); fwd != "" {
		return strings.TrimSpace(strings.SplitN(fwd, ",", 2)[0])
	}
	if real := r.Header.Get("X-Real-IP"); real != "" {
		return strings.TrimSpace(real)
	}
	return "127.0.0.1"
}

var validLocales = map[string]bool{"ru": true, "en": true, "ar": true}

func handleSetLocale(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Locale string `json:"locale"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || !validLocales[body.Locale] {
		writeJSON(w, 400, map[string]string{"error": "invalid locale"})
		return
	}
	http.SetCookie(w, &http.Cookie{
		Name:     "locale",
		Value:    body.Locale,
		Path:     "/",
		MaxAge:   31536000,
		SameSite: http.SameSiteLaxMode,
	})
	writeJSON(w, 200, map[string]bool{"ok": true})
}

var validSizes = map[string]bool{"100": true, "1000": true, "10000": true}

func handleTestfile(w http.ResponseWriter, r *http.Request) {
	size := r.URL.Query().Get("size")
	nodeID := r.URL.Query().Get("node")

	if !validSizes[size] {
		writeJSON(w, 400, map[string]string{"error": "invalid size"})
		return
	}

	node := findNode(nodeID)
	if node == nil {
		writeJSON(w, 500, map[string]string{"error": "nodes not configured"})
		return
	}

	agentURL := fmt.Sprintf("%s/testfile?size=%s", node.URL, size)
	resp, err := httpClient.Get(agentURL)
	if err != nil {
		writeJSON(w, 502, map[string]string{"error": "agent unreachable"})
		return
	}
	defer resp.Body.Close()

	for _, h := range []string{"Content-Type", "Content-Length", "Content-Disposition"} {
		if v := resp.Header.Get(h); v != "" {
			w.Header().Set(h, v)
		}
	}
	w.WriteHeader(resp.StatusCode)
	io.Copy(w, resp.Body)
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, 200, map[string]bool{"ok": true})
}

func findNode(id string) *NodeConfig {
	if len(nodes) == 0 {
		return nil
	}
	for i := range nodes {
		if nodes[i].ID == id {
			return &nodes[i]
		}
	}
	return &nodes[0]
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func mustJSON(v any) string {
	b, _ := json.Marshal(v)
	return string(b)
}

func withLogging(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rw := &responseWriter{ResponseWriter: w, status: 200}
		next(rw, r)
		log.Printf("%s %s %d %dms",
			r.Method, r.URL.Path, rw.status,
			time.Since(start).Milliseconds())
	}
}

type responseWriter struct {
	http.ResponseWriter
	status int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.status = code
	rw.ResponseWriter.WriteHeader(code)
}
