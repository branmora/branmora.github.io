---
title: "De artículos estáticos a agentes de IA en la investigación económica: qué viene después de la transparencia"
short_title: "De artículos estáticos a agentes de IA"
description: "Los paquetes de replicación hicieron transparente la investigación económica. Con agentes de IA y el MCP, los artículos pueden volverse entornos para explorar."
slug: de-articulos-estaticos-a-agentes-de-ia
date: 2025-12-20
type: note
translationKey: from-static-papers-to-ai-agents
linkedin: https://www.linkedin.com/pulse/from-static-papers-ai-agents-economics-research-what-comes-mora-c9g7e/
topics:
  - working-with-ai
  - open-science
featured: true
---
![La portada del artículo: el título “From Static Papers to AI Agents in Economics Research” y el subtítulo “What comes after transparency and replication packages”, en azul oscuro sobre una franja blanca, encima de una red de puntos y líneas en azul pálido, un documento desenfocado y tres pequeños robots de caricatura.](static-papers-cover.png)

Últimamente he pensado en lo que pasa después de que se publica un artículo de investigación. En economía pasamos la última década convirtiendo la “transparencia” en el estándar de oro. En mi trabajo dedico buena parte del tiempo a revisar y corregir errores en artículos, y aunque ya es rutina subir los datos y el código a un paquete de replicación (el conjunto de archivos que sirve para reproducir un estudio), todavía hay muchísima fricción. Incluso cuando un paquete debería correr con un solo clic, preparar el entorno y arreglar el código de análisis suele costar tanto que la mayoría de los investigadores se queda con el PDF y sigue de largo.

## Cuando el artículo se vuelve un entorno

Hace poco vi una pista de cómo superar esto en un curso en línea de UC Berkeley sobre IA agéntica. En una de las clases, sus investigadores mostraron un [sistema en el que el artículo de investigación](https://arxiv.org/abs/2509.06917) es un entorno vivo. En lugar de solo leer, por ejemplo, un resumen de los resultados, puedes interactuar con la lógica que los sostiene. Puedes cambiar una variable o correr otro cálculo directamente sobre el artículo y ver si los hallazgos se sostienen en otras condiciones.

Aquí entra el [Model Context Protocol (MCP)](https://modelcontextprotocol.io/introduction). Piensa en el MCP como un “enchufe” universal para la IA: así como un puerto USB le permite a una computadora conectarse con otros dispositivos, el MCP le permite a una IA moverse entre el texto del artículo, los datos originales y el código de análisis. Ya no hace falta reconstruir a mano el entorno de la investigación cada vez que queremos hacer una pregunta nueva.

![Captura de pantalla de la página del MOOC Agentic AI, otoño de 2025. La página tiene enlaces a un formulario de inscripción, a un Discord de LLM Agents y a un Agentic AI Summit, y dice que el curso continúa los MOOC de 2024 y 2025. Una sección “Course Staff” muestra las fotos y los nombres de las instructoras: Dawn Song, profesora en UC Berkeley, y Xinyun Chen, científica investigadora en Meta.](static-papers-agentic-ai-course.png "Página de inicio: [el curso de LLM Agents de UC Berkeley](https://web.archive.org/web/20251218005814/https://agenticai-learning.org/f25)")

## Un ejemplo: diferencias en diferencias

Un ejemplo es el cambio reciente en diferencias en diferencias (DiD), un método estadístico común para medir el impacto de una política comparando grupos a lo largo del tiempo. Descubrimos que el modelo tradicional que usamos los economistas (conocido como efectos fijos de dos vías) puede dar resultados sesgados cuando la política empieza en momentos distintos para distintas personas. Simplifico para contar la historia, pero el problema de fondo, el sesgo, está [bien documentado](https://doi.org/10.1016/j.jeconom.2021.03.014).

Antes, si leía un artículo fascinante sobre impuestos al carbono y me preguntaba “¿y si hubieran usado un estimador más robusto, como el de [Callaway y Sant’Anna](https://doi.org/10.1016/j.jeconom.2020.12.001), para corregir este sesgo de tiempos?”, tenía que reservar un fin de semana entero. Tenía que descargar sus datos, limpiarlos y reescribir su análisis desde cero.

Con un sistema agéntico, solo le indico al asistente dónde está el repositorio. Como tiene acceso a herramientas a través del MCP, puede ver la estructura de los datos, notar que la política entra en momentos escalonados y correr la nueva prueba por su cuenta. En pocas palabras, explora la idea que yo no tenía tiempo de probar. Pasa de leer la investigación a extenderla.

*[Demostración del agente de AlphaGenome para interpretar datos genómicos. Fuente: Paper2Agent en GitHub](https://github.com/jmiao24/Paper2Agent)*

## De leer la investigación a conversar con ella

Es un cambio de fondo en cómo valoramos la investigación. Cuando armar una regresión nueva o una nueva prueba de diagnóstico se vuelve barato, nuestro valor como economistas pasa a estar en saber qué preguntas conviene hacerse.

En los próximos años, creo que no solo publicaremos “artículos”, sino “entornos agénticos”. Quien te lea no tendrá que creerte lo que dice tu sección de resultados: usará su agente para poner a prueba tus hallazgos y explorar hipótesis nuevas con tus datos, en tiempo real. Pasamos de un mundo en el que consumimos investigación a uno en el que conversamos con ella.
