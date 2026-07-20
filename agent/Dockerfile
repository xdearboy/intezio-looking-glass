FROM golang:1.22-alpine AS builder

WORKDIR /app
COPY go.mod ./
COPY *.go ./
RUN go build -o agent .

FROM alpine:3.19

RUN apk add --no-cache ca-certificates iputils traceroute mtr whois iperf3

COPY --from=builder /app/agent /agent

ENTRYPOINT ["/agent"]
