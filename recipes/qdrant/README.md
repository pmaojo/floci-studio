# 🧠 Qdrant for Floci Studio

**Qdrant** is a blazing-fast, open-source vector database written in Rust. Store embeddings, run similarity search at scale, and power semantic search or RAG (retrieval-augmented generation) pipelines — all locally.

Combine it with the **Ollama** recipe to generate embeddings and run a complete offline AI search stack.

## ✨ Features
- **Vector search**: Approximate nearest-neighbour search with rich payload filtering.
- **Built-in dashboard**: Visual collection browser at `/dashboard`.
- **REST + gRPC**: Use whichever fits your latency/throughput needs.
- **Persistent storage**: A named volume keeps your collections between restarts.

## 🚀 Usage in Floci Studio
When you start the Qdrant recipe, you can configure:
- **REST / Dashboard Port**: Host port for the REST API and web dashboard (default: `6333`).
- **gRPC Port**: Host port for the gRPC API (default: `6334`).
- **API Key**: Key required in the `api-key` header (default: `qdrant123`).

### Create a collection
```bash
curl -X PUT http://localhost:6333/collections/docs \
  -H "api-key: qdrant123" \
  -H "Content-Type: application/json" \
  -d '{ "vectors": { "size": 768, "distance": "Cosine" } }'
```

Open the dashboard at **http://localhost:6333/dashboard** to inspect collections and run queries visually.
