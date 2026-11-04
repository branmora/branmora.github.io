---
title: "chaski: a simple workflow for AI coding agents on GitHub"
short_title: "chaski: a workflow for AI coding agents"
description: "chaski is a simple workflow for AI coding agents on GitHub: a short spec, issues in order, one agent that builds, another that reviews, and tests before merge."
slug: introducing-chaski
date: 2026-10-31
type: post
translationKey: introducing-chaski
linkedin: https://www.linkedin.com/feed/update/urn:li:activity:7522402508703555584/
topics:
  - working-with-ai
featured: true
image:
  src: chaski-workflow.jpg
  alt: "The chaski workflow in four steps, in dark type on cream paper. Under the chaski logo, a row of hanging cords with one in red, the headline reads “A simple workflow for AI coding agents on GitHub.” A vertical line joins four numbered steps, each with a small icon at the right: 1, “Write a short spec”, beside a page of text; 2, “Plan the work as GitHub issues”, beside the logo’s hanging cords; 3, “One agent builds, another reviews”, beside an open and a filled circle split by a dotted line; 4, “Merge after tests and review pass”, beside three dots on a vertical line."
---
I'm excited to share chaski, a small open-source project I've been using to build software with AI coding agents.

Coding agents have become remarkably capable. But when I give an agent a large feature, a few problems keep showing up. The agent drifts from the plan as it works. When the chat context resets, it loses track of what it was doing. And the agent that wrote the code is often the same one reporting that the code works, which isn't a reliable signal.

chaski is a set of instructions, a single file called AGENTS.md, that you add to your project. It asks the agents to organize their work in a way that addresses these problems:

- You write a short spec: what you want, how to check it, and what's out of scope. Then you approve it.
- The agent breaks the spec into GitHub issues, linked in the order they need to be done, and writes the tests before writing any code. Because the plan lives on GitHub, nothing is lost when the chat resets.
- One agent implements each issue. A separate agent, which hasn't seen the first agent's reasoning, reviews the work against the spec.
- Code is merged only when the tests pass and the reviewer approves.

None of these ideas is new. Writing a spec first, separating the person who writes code from the person who reviews it, and requiring passing tests before a merge are long-standing software engineering practices. What's new is that agents can now carry them out with very little human effort.

chaski is designed for individuals and small teams who want to move quickly. It doesn't need a new tool or database. It uses GitHub Issues, which many of you already use.

The name comes from the chaskis, the relay runners of the Inca road network, which met in Cusco, where I'm from. Each runner carried a message across one stretch before passing it on, much as each agent here handles one part of the work.

It's free and open source. I hope you find it useful, and I'd love to hear your feedback. [github.com/branmora/chaski](https://github.com/branmora/chaski)
