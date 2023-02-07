---
# https://pandoc.org/MANUAL.html#variables-for-latex
papersize: a4
documentclass: scrartcl
linestretch: 1.15
fontsize: 12pt
toc-title: Inhaltsverzeichnis
---

\newpage
\renewcommand{\listfigurename}{Abbildungsverzeichnis}
\listoffigures
\addcontentsline{toc}{section}{Abbildungsverzeichnis}

\newpage
\renewcommand{\listtablename}{Tabellenverzeichnis}
\listoftables
\addcontentsline{toc}{section}{Tabellenverzeichnis}
