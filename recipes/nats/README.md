# 📡 NATS JetStream for Floci Studio

**NATS** is an ultralight, high-performance messaging system. With **JetStream** enabled, it adds persistent streams and queues on top of its core pub/sub — making it a fast local alternative to SNS (pub/sub) and SQS (durable queues). A built-in HTTP monitoring panel is included.

## ✨ Features
- **Pub/Sub + JetStream**: Fire-and-forget messaging plus durable, replayable streams.
- **Tiny & fast**: Single ~15 MB binary, microsecond latencies.
- **Monitoring endpoint**: HTTP panel with metrics, subjects and active connections.
- **Polyglot clients**: SDKs for Go, Node.js, Python, Rust, and more.

## 🚀 Usage in Floci Studio
When you start the NATS recipe, you can configure:
- **NATS Client Port**: Port for client SDK connections (default: `4222`).
- **Monitoring HTTP Port**: Port for the HTTP monitoring panel (default: `8222`).

Connect any NATS client to `nats://localhost:4222`, and open the monitoring panel at **http://localhost:8222**.

> 💡 JetStream is enabled via the `-js` flag, so you can create persistent streams immediately.
