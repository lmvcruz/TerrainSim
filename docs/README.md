# TerrainSim Documentation

## 📁 Documentation Structure

### 📋 [plan/](plan/)
**Project Planning & Tracking** (3 files only)
- **[Backlog.md](plan/Backlog.md)** - Deferred features and future ideas
- **[REPO_IMPROVEMENT_PLAN.md](plan/REPO_IMPROVEMENT_PLAN.md)** - Repository quality improvements and task tracking

### 🏗️ [infra/](infra/)
**Infrastructure & Operations** (8 essential documents)
- **[DEPLOYMENT.md](infra/DEPLOYMENT.md)** - Complete deployment guide (Cloudflare + AWS EC2, CI/CD)
- **[LOCAL_ENVIRONMENT_GUIDE.md](infra/LOCAL_ENVIRONMENT_GUIDE.md)** - Docker setup, local testing, log capture
- **[ENVIRONMENT_VALIDATION.md](infra/ENVIRONMENT_VALIDATION.md)** - Pre-development environment checks
- **[TESTING_GUIDE.md](infra/TESTING_GUIDE.md)** - Unit, integration, E2E, load testing
- **[BENCHMARK_BASELINE.md](infra/BENCHMARK_BASELINE.md)** - C++ performance benchmarks
- **[MONITORING.md](infra/MONITORING.md)** - PM2 logging, UptimeRobot, Cloudflare Analytics
- **[LOGGING_SYSTEM.md](infra/LOGGING_SYSTEM.md)** - Application logging architecture
- **[performance-thresholds.md](infra/performance-thresholds.md)** - Load testing thresholds and baselines

### 📐 [spec/](spec/)
**System Specifications & Feature Documentation**
- **[System-Spec.md](spec/System-Spec.md)** - High-level system architecture and design decisions
- **[algorithms/](spec/algorithms/)** - Algorithm documentation:
  - [HYDRAULIC_EROSION.md](spec/algorithms/HYDRAULIC_EROSION.md) - Particle-based water erosion
  - [HYDRAULIC_EROSION_MODEL.md](spec/algorithms/HYDRAULIC_EROSION_MODEL.md) - Physics model
- **[features/](spec/features/)** - Feature specifications:
  - [JOB_SYSTEM_ARCHITECTURE.md](spec/JOB_SYSTEM_ARCHITECTURE.md) - Job-based execution model
  - [JOB_SYSTEM_API.md](spec/JOB_SYSTEM_API.md) - Job system API reference
  - [JOB_SYSTEM_USER_GUIDE.md](spec/JOB_SYSTEM_USER_GUIDE.md) - User-facing job system guide
  - [API.md](spec/API.md) - Backend REST API and WebSocket documentation
  - [AGENT_DEBUGGING_WORKFLOW.md](spec/AGENT_DEBUGGING_WORKFLOW.md) - AI agent debugging guide

### 🗂️ [temp/](temp/)
**Temporary & Uncertain Documentation** (quarterly review)
- **[VISUAL_REGRESSION_TESTING.md](temp/VISUAL_REGRESSION_TESTING.md)** - Visual testing exploration
- **[DEPENDENCY_AUDIT_2026-01-16.md](temp/DEPENDENCY_AUDIT_2026-01-16.md)** - Dependency audit snapshot
- **[DEAD_CODE_REPORT_2026-01-16.md](temp/DEAD_CODE_REPORT_2026-01-16.md)** - Dead code analysis snapshot

---

## 🔗 Quick Links

### For Developers
- [Getting Started](../README.md) - Project setup and installation
- [System Architecture](spec/System-Spec.md) - Component overview and design decisions
- [API Documentation](spec/API.md) - Backend endpoints and WebSocket events
- [Testing Guide](infra/TESTING_GUIDE.md) - How to run all test types

### For Operations
- [Deployment Guide](infra/DEPLOYMENT.md) - Deploy to production (manual + automated)
- [Monitoring Setup](infra/MONITORING.md) - Configure logging and alerts
- [Local Environment](infra/LOCAL_ENVIRONMENT_GUIDE.md) - Docker setup for testing

### For Understanding the System
- [Job System Architecture](spec/JOB_SYSTEM_ARCHITECTURE.md) - How simulations execute
- [Hydraulic Erosion Algorithm](spec/algorithms/HYDRAULIC_EROSION.md) - Implementation details
- [Erosion Physics Model](spec/algorithms/HYDRAULIC_EROSION_MODEL.md) - Theoretical foundation

---

## 📝 Documentation Organization Principles

### What Goes Where

**plan/**
- Keep only: Backlog, REPO_IMPROVEMENT_PLAN
- Delete: Completed task summaries, temporary planning docs

**infra/**
- Infrastructure setup, deployment procedures, testing guides
- Keep: 6-8 essential operational documents
- Delete: Task-specific summaries after completion

**spec/**
- System architecture, algorithm specifications, feature documentation
- Max 200 lines per doc, concept-focused (not implementation code)
- Organized into subdirectories: algorithms/, features/

**temp/**
- Uncertain long-term value, experimental documentation
- Review quarterly for deletion or promotion

### Documentation Standards

- **Concise**: Max 200 lines for specifications, 300 for System-Spec
- **Concept-focused**: Explain behavior and decisions, not implementation details
- **No duplication**: Single source of truth for each topic
- **Versioned**: Include "Last Updated" date
- **Linked**: Cross-reference related documents

---

**Last Updated**: January 19, 2026
**Documentation Cleanup**: DOC-201 completed

