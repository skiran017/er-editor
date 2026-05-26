# Abstract

## Riassunto (Italiano)

Lo studio dei modelli Entità-Relazione (ER) in notazione di Chen è una componente
fondamentale dei corsi di basi di dati alla SUPSI. Lo strumento didattico in uso,
*ERDesigner*, è un'applicazione desktop Java utilizzata da studenti e docenti. Questo
progetto presenta una controparte basata su web che copre quanto offre ERDesigner e lo
estende: riproduce la notazione di Chen, gira in qualsiasi browser moderno senza
installazione, funziona su dispositivi touch e può essere incorporata nelle attività di
Moodle per esercitazioni ed esami — mantenendo la compatibilità con i file di ERDesigner.

L'editor è costruito come una *single-page application* in React e TypeScript, con
un'architettura a livelli (dominio → stato → interazione → canvas → interfaccia) che
isola le regole del modello dalla loro rappresentazione visiva. La notazione di Chen è
implementata come *plugin* — glifi, regole di validazione e codec di importazione/
esportazione sono moduli sostituibili — così che notazioni future (Crow's Foot, UML)
possano essere aggiunte senza modificare il nucleo. Lo strumento mantiene la
compatibilità di andata e ritorno con il formato XML dell'applicazione Java esistente,
convalida i diagrammi rispetto alle regole della notazione di Chen e comunica con
Moodle tramite l'API `postMessage` con salvataggio automatico.

Il risultato è uno strumento responsivo e multilingue, validato da quasi mille test
automatici, distribuito pubblicamente e pronto per l'integrazione didattica. Il
documento descrive il contesto, i requisiti, l'architettura, l'implementazione, la
strategia di test e la distribuzione del progetto.

## Abstract (English)

The study of Entity-Relationship (ER) models in Chen notation is a core component of
the database courses at SUPSI. The established teaching tool, *ERDesigner*, is a Java
desktop application used by students and instructors. This project presents a web-based
counterpart that covers what ERDesigner does and extends it: it reproduces Chen notation,
runs in any modern browser without installation, works on touch devices, and can be
embedded inside Moodle activities for exercises and examinations — while remaining
file-compatible with ERDesigner.

The editor is built as a single-page application in React and TypeScript, with a
layered architecture (domain → state → interaction → canvas → user interface) that
isolates the model rules from their visual representation. Chen notation is implemented
as a plugin — glyphs, validation rules, and import/export codecs are swappable modules
— so that future notations (Crow's Foot, UML) can be added without changing the core.
The tool preserves round-trip compatibility with the XML format of the existing Java
application, validates diagrams against Chen-notation rules, and communicates with
Moodle through the `postMessage` API with automatic saving.

The result is a responsive, multilingual tool, validated by nearly one thousand
automated tests, publicly deployed and ready for educational integration. This document
describes the project's context, requirements, architecture, implementation, testing
strategy, and deployment.
