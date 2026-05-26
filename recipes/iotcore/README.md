# ☁️ AWS IoT Core (MQTT) for Floci Studio

**AWS IoT Core (MQTT)** is a local MQTT broker that emulates the AWS IoT Core message broker and device registry.

It allows you to connect local applications or devices and test publish/subscribe channels seamlessly in a local development environment.

## ✨ Features
- **Local MQTT Broker**: Emulates AWS IoT Core's message brokering capabilities.
- **Publish & Subscribe**: Test bidirectional communication channels easily.
- **Lightweight**: Ideal for rapid prototyping without connecting to the actual cloud service.

## 🚀 Usage in Floci Studio
When you start the AWS IoT Core recipe via Floci Studio, you can configure:
- **MQTT Broker Port**: The port your local application will use to connect to the broker (default: `1883`).

Access it via TCP: `tcp://localhost:1883` (or your configured port).
