# 🔐 Keycloak for Floci Studio

**Keycloak** is an open-source identity and access management solution, bundled here with a robust PostgreSQL database for storage.

It provides a comprehensive suite of tools for handling authentication, authorization, user federation, and social login, making it a perfect testing bed for integrating IAM into your applications locally.

## ✨ Features
- **Identity & Access Management**: Fully featured SSO (Single Sign-On).
- **PostgreSQL Database**: Uses a dedicated local Postgres database for persistent and reliable configuration storage.
- **Admin Console**: A powerful UI to manage realms, clients, users, and roles.
- **Standard Protocols**: Supports OAuth2.0, OpenID Connect, and SAML 2.0.

## 🚀 Usage in Floci Studio
When you start the Keycloak recipe via Floci Studio, you can configure:
- **External HTTP Port**: The port to access the Keycloak frontend and Admin Console (default: `8080`).
- **Admin Username**: Default `admin`.
- **Admin Password**: Default `admin123`.
- **Database Name**: Default `keycloak_db`.

Access the Keycloak server at `http://localhost:8080` (or your configured port).
