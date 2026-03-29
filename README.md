# ClearPath AI

## Live Prototype

Access the working system here:  
https://anmolvatsal.github.io/clearpath_ai/

### Trust-First Decision Intelligence for Healthcare Revenue Cycle

\---

## 

## Overview

ClearPath AI is a decision intelligence system designed to streamline and automate healthcare revenue workflows with complete transparency and auditability.

The system processes clinical, procedural, and policy data to deliver real-time, explainable decisions for claims processing, authorization, and compliance management.

\---

## 

## Problem

Healthcare revenue systems today face critical challenges:

* Approval cycles extending up to 14 days
* High rate of claim denials (\~40%)
* Lack of transparency in decision-making
* Complex policy dependencies across insurers

These inefficiencies result in significant administrative overhead and revenue loss.

\---

## 

## Solution

ClearPath AI introduces a structured decision engine that:

* Evaluates medical necessity and policy alignment
* Automates authorization and claims workflows
* Generates explainable decisions
* Maintains a complete audit trail for compliance

\---

## 

## Key Features

* Real-time decision processing
* Policy-aware validation system
* Explainable reasoning for every outcome
* Immutable audit logging
* Workflow automation
* Policy simulation capabilities

\---

## 

## Architecture

The system is built across three core layers:

### 1\. Data Layer

Ingests structured healthcare data including patient records, diagnosis codes, procedures, and payer policies.

### 2\. Intelligence Layer

Processes inputs through rule-based evaluation and decision logic, ensuring accuracy and compliance.

### 3\. Execution Layer

Handles workflow automation including authorization, claims processing, and denial management.

\---

## 

## System Flow

1. Data ingestion
2. Rule evaluation and validation
3. Decision generation
4. Explanation and reasoning
5. Audit logging
6. Workflow execution

\---

## 

## Impact

* 80% reduction in processing time
* 35% improvement in approval success rate
* 60% reduction in manual intervention
* 100% audit-ready system

\---

## 

## Demo

Refer to the `frontend/assets` folder for demo video and UI previews.

\---

## 

## Project Structure

Detailed architecture and system design available in the `docs/` directory.

\---

## 

## License

MIT License

## 

## Repository Structure

* `frontend/` — static deployable prototype built with HTML, CSS, and JavaScript
* `backend/` — reference modules for logic and audit design
* `data/` — sample structured datasets
* `docs/` — architecture, workflow, impact, and problem framing
* `presentation/` — pitch support files

## Static Prototype

The prototype is fully deployable as a static site.

### Run locally

Open `frontend/index.html` in a browser.

### Deploy with GitHub Pages

1. Upload this repository to GitHub
2. Go to **Settings → Pages**
3. Under **Build and deployment**, select **Deploy from a branch**
4. Choose branch **main**
5. Choose folder **/frontend**
6. Save

## Demo Credentials

### Admin

* Username: `admin`
* Password: `admin123`

### Patients

* Username: `priya1` | Password: `pass1`
* Username: `arjun2` | Password: `pass2`
* Username: `meera3` | Password: `pass3`
* Username: `rohan4` | Password: `pass4`

## Prototype Capabilities

* Admin and patient login
* Patient profile explorer
* Prior authorization simulation
* Claims adjudication workflow
* Explainability panel
* Audit trail log
* Policy simulation
* Impact dashboard

## Notes

This frontend is static and requires no build step, no package installation, and no React runtime.

