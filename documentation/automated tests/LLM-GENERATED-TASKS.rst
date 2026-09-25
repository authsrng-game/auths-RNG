====================================
Automated Jules Agents
====================================

This document describes the automated Jules agent tasks configured to run
against the repository. Each agent runs on a fixed daily schedule (times in
MDT) and is scoped to a single area of concern.

Every task gets submitted to a PR where it gets judged and reviewed.

Information about Jules: https://jules.google/

# Overview

.. list-table::
:header-rows: 1
:widths: 15 15 20 15

- - Agent
  - Icon
  - Focus Area
  - Schedule (MDT)
- - Sentinel
  - 🛡️
  - Security
  - Daily 03:00 AM
- - Balancer
  - ⚖️
  - Economy tuning
  - Daily 03:00 AM
- - Herald
  - 📢
  - Observability
  - Daily 04:00 AM
- - Marshal
  - 🎯
  - Test coverage
  - Daily 07:00 AM
- - Scout
  - 🔍
  - Bug hunting
  - Daily 06:30 AM
- - Bolt
  - ⚡
  - Performance
  - Daily 10:00 AM
- - Syncer
  - 🔄
  - State consistency
  - Daily 11:30 AM
- - Custodian
  - 🧹
  - Codebase hygiene
  - Daily 11:30 AM
- - Ledger
  - 🏷️
  - Server trust
  - Daily 12:30 PM
- - Archivist
  - 📚
  - Documentation
  - Daily 02:00 PM
- - Warden
  - 🔒
  - Lifecycle management
  - Daily 06:00 PM
- - Palette
  - 🎨
  - UX / accessibility
  - Daily 06:00 PM
- - Chronos
  - ⏱️
  - Timing / clock integrity
  - Daily 11:30 PM

All agents are currently marked **Active**.

# Agent Details

## Sentinel: Security

:Schedule: Daily at 03:00 AM MDT
:Status: Active

A security-focused agent that protects the codebase from vulnerabilities.
Reviews changes and existing code for exploitable issues, unsafe patterns,
and dependency risks, and remediates or flags them.

## Balancer: Economy Tuning

:Schedule: Daily at 03:00 AM MDT
:Status: Active

An economy-tuning-focused agent that keeps the game's numbers (costs,
rewards, progression curves) balanced and internally consistent.

## Herald: Observability

:Schedule: Daily at 04:00 AM MDT
:Status: Active

An observability-focused agent that ensures failures are visible instead of
silently swallowed — improving logging, error surfacing, and monitoring
signal throughout the codebase.

## Scout: Bug Hunting

:Schedule: Daily at 06:30 AM MDT
:Status: Active

A detail-obsessed agent that hunts down and fixes one small, concrete bug
per run rather than attempting broad sweeps.

## Marshal: Test Coverage

:Schedule: Daily at 07:00 AM MDT
:Status: Active

A coverage-focused agent that backfills automated tests for logic that
currently has no test coverage.

## Bolt: Performance

:Schedule: Daily at 10:00 AM MDT
:Status: Active

A performance-obsessed agent that makes the codebase faster, one targeted
optimization at a time.

## Syncer: State Consistency

:Schedule: Daily at 11:30 AM MDT
:Status: Active

A state-consistency-focused agent that keeps `localStorage` keys and
related persisted state aligned with the current data model.

## Custodian: Hygiene

:Schedule: Daily at 11:30 AM MDT
:Status: Active

A hygiene-focused agent that removes dead code, unused assets, and other
artifacts that shouldn't be in the repository.

## Ledger: Server Trust

:Schedule: Daily at 12:30 PM MDT
:Status: Active

A server-trust-focused agent that makes sure the self-hosted server remains
a trustworthy source of truth (validation, anti-cheat, authoritative state).

## Archivist: Documentation

:Schedule: Daily at 02:00 PM MDT
:Status: Active

A documentation-focused agent that keeps the codebase's knowledge base
(READMEs, comments, changelogs) up to date with recent changes.

## Warden: Lifecycle Management

:Schedule: Daily at 06:00 PM MDT
:Status: Active

A lifecycle-focused agent that makes sure everything that starts (timers,
listeners, connections, processes) also stops cleanly.

## Palette: UX / Accessibility

:Schedule: Daily at 06:00 PM MDT
:Status: Active

A UX-focused agent that adds small touches of delight and accessibility
improvements throughout the interface.

## Chronos: Timing Integrity

:Schedule: Daily at 11:30 PM MDT
:Status: Active

A timing-focused agent that makes sure the game's clock stays honest..
guarding against client-side time manipulation and drift.

# Notes

- Schedule times are listed in Mountain Daylight Time (MDT).
- Each agent is intentionally narrow in scope; broader changes should be
  reviewed manually rather than left to a single agent.
- This document should be updated whenever an agent's schedule, scope, or
  active status changes.
