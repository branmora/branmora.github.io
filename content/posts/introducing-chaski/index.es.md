---
title: "chaski: un flujo de trabajo sencillo para agentes de programación con IA en GitHub"
short_title: "chaski: flujo de trabajo para agentes de IA"
description: "chaski es un flujo de trabajo para agentes de programación con IA en GitHub: una especificación corta, issues en orden, un agente construye y otro revisa."
slug: lanzamiento-de-chaski
date: 2026-10-31
type: post
translationKey: introducing-chaski
linkedin: https://www.linkedin.com/feed/update/urn:li:activity:7522402508703555584/
topics:
  - working-with-ai
featured: true
image:
  src: chaski-workflow.jpg
  alt: "El flujo de trabajo de chaski en cuatro pasos, con letras oscuras sobre papel crema y los textos en inglés. Bajo el logo de chaski, una fila de cuerdas colgantes con una en rojo, el titular dice “A simple workflow for AI coding agents on GitHub.” (un flujo de trabajo sencillo para agentes de programación con IA en GitHub). Una línea vertical une cuatro pasos numerados, cada uno con un pequeño ícono a la derecha: 1, “Write a short spec” (escribir una especificación breve), junto a una hoja de texto; 2, “Plan the work as GitHub issues” (planificar el trabajo como issues de GitHub), junto a las cuerdas colgantes del logo; 3, “One agent builds, another reviews” (un agente construye, otro revisa), junto a un círculo vacío y uno relleno separados por una línea punteada; 4, “Merge after tests and review pass” (integrar cuando pasan las pruebas y la revisión), junto a tres puntos sobre una línea vertical."
---
Me entusiasma compartir chaski, un pequeño proyecto de código abierto que he estado usando para desarrollar software con agentes de programación con IA.

Los agentes de programación se han vuelto notablemente capaces. Pero cuando le encargo a un agente una funcionalidad grande, siempre aparecen los mismos problemas. El agente se desvía del plan a medida que avanza. Cuando el contexto del chat se reinicia, pierde el hilo de lo que estaba haciendo. Y el agente que escribió el código suele ser el mismo que informa que el código funciona, lo cual no es una señal confiable.

chaski es un conjunto de instrucciones, un único archivo llamado AGENTS.md, que agregas a tu proyecto. Les pide a los agentes que organicen su trabajo de una forma que resuelve estos problemas:

- Escribes una especificación breve: qué quieres, cómo comprobarlo y qué queda fuera del alcance. Luego la apruebas.
- El agente divide la especificación en issues de GitHub, enlazados en el orden en que deben hacerse, y escribe las pruebas antes de escribir cualquier código. Como el plan vive en GitHub, nada se pierde cuando el chat se reinicia.
- Un agente implementa cada issue. Otro agente, que no ha visto el razonamiento del primero, revisa el trabajo contra la especificación.
- El código se integra solo cuando pasan las pruebas y el revisor lo aprueba.

Ninguna de estas ideas es nueva. Escribir primero una especificación, separar a quien escribe el código de quien lo revisa y exigir que pasen las pruebas antes de integrar son prácticas de ingeniería de software de larga data. Lo nuevo es que ahora los agentes pueden llevarlas a cabo con muy poco esfuerzo humano.

chaski está pensado para personas y equipos pequeños que quieren avanzar rápido. No necesita una herramienta ni una base de datos nuevas. Usa GitHub Issues, que muchos ya usan.

El nombre viene de los chaskis, los corredores de relevos de la red de caminos inca, que confluía en el Cusco, de donde soy. Cada corredor llevaba un mensaje a lo largo de un tramo antes de pasarlo al siguiente, tal como aquí cada agente se encarga de una parte del trabajo.

Es gratuito y de código abierto. Espero que te sea útil, y me encantaría conocer tus comentarios: [github.com/branmora/chaski](https://github.com/branmora/chaski)
