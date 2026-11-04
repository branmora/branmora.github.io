---
title: "From Static Papers to AI Agents in Economics Research: What comes after transparency"
short_title: "From Static Papers to AI Agents in Economics"
description: "Replication packages made economics research transparent. AI agents and MCP can turn papers into environments that readers question, test, and extend."
slug: from-static-papers-to-ai-agents
date: 2025-12-20
type: note
translationKey: from-static-papers-to-ai-agents
linkedin: https://www.linkedin.com/pulse/from-static-papers-ai-agents-economics-research-what-comes-mora-c9g7e/
topics:
  - working-with-ai
  - open-science
featured: true
---
![The article's cover: the title “From Static Papers to AI Agents in Economics Research” and the subtitle “What comes after transparency and replication packages”, in dark blue on a white band, over a pale blue network of dots and lines, a blurred document, and three small cartoon robots.](static-papers-cover.png)

I’ve been thinking about what happens after a research paper is published. In the economics world, we spent the last decade making “transparency” the gold standard. I’ve spent a lot of my time troubleshooting and fixing errors in papers as part of my day work, and while it’s now routine to upload our data and code to a Replication Package (the digital bundle of files used to reproduce a study), there is still a massive amount of friction. Even when these packages are meant to be runnable in one click, the effort of setting up environments and fixing analysis code is often high enough that most researchers just look at the PDF and move on.

## When the paper becomes an environment

I saw a glimpse of how we move past this recently in an Agentic AI Online Course from UC Berkeley. In one of the lectures, researchers there showed a [system where the research paper](https://arxiv.org/abs/2509.06917) is an active environment. Instead of only reading, say, a summary of the results, you can actually interact with the underlying logic. You can change a variable or run a different calculation right there on the paper to see if the findings hold up under different conditions.

This is where the [Model Context Protocol (MCP)](https://modelcontextprotocol.io/introduction) comes in. Think of MCP as a universal “plug” for AI, just as an USB port allows a computer to connect with other devices, MCP allows an AI to move between the text of the paper, the raw data, and the analysis code. It removes the need for us to manually rebuild the research environment every time we want to ask a new question.

![Webpage screenshot for the Agentic AI MOOC, Fall 2025. The page lists links for a signup form, an LLM Agents Discord, and an Agentic AI Summit. It notes the course builds on previous 2024 and 2025 MOOCs. A "Course Staff" section features photos and names of the instructors: Dawn Song, a Professor at UC Berkeley, and Xinyun Chen, a Research Scientist at Meta.](static-papers-agentic-ai-course.png "Homepage: [UC Berkeley's LLM Agents Course](https://web.archive.org/web/20251218005814/https://agenticai-learning.org/f25)")

## An example: Difference-in-Differences

Take the recent shift in Difference-in-Differences (DiD), a common statistical method used to measure the impact of a policy by comparing groups over time. We found out that the traditional model used by economists (known as Two-Way Fixed Effects), can be biased when the policy starts at different times for different people (I am oversimplying here for the sake of the narrative, but the core issue of bias is [well-documented](https://doi.org/10.1016/j.jeconom.2021.03.014)).

In the old world, if I read a fascinating paper on carbon taxes and wondered, "What if they used a more robust estimator (like [Callaway and Sant’Anna](https://doi.org/10.1016/j.jeconom.2020.12.001) to fix this timing bias?), I’d have to block out a whole weekend. I’d have to download their data, clean it and rewrite their analysis from scratch.

With an agentic system, I just point the assistant at the repository. Because it has tool access via MCP, it can see the data structure, recognize the staggered timing, and run the new test on its own. In a nutshell, it explores the idea that I didn't have the time to test myself. It moves from reading the research to extending it.

*[Demo of the AlphaGenome Agent for Genomic Data Interpretation. Source: Paper2Agent GitHub](https://github.com/jmiao24/Paper2Agent)*

## From reading research to talking with it

This is a fundamental shift in how we value research. When the building of a new regression or a new diagnostic test becomes cheap, our value as economists shifts to knowing which questions are worth asking in the first place.

In the next few years, I expect we won't just be publishing "papers." We will be publishing "agentic environments." A reader won't just take your word for it in the results section; they will use their agent to stress-test your findings and explore new hypotheses on your data in real-time. We are moving from a world where we consume research to a world where we have a conversation with it.
