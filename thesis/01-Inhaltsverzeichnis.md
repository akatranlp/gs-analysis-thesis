---
# https://pandoc.org/MANUAL.html#variables-for-latex
papersize: a4
documentclass: scrartcl
linestretch: 1.15
fontsize: 12pt
---

\addcontentsline{toc}{section}{Inhaltsverzeichnis}
\renewcommand{\contentsname}{Inhaltsverzeichnis}
\tableofcontents

\newpage
\renewcommand{\listfigurename}{Abbildungsverzeichnis}
\renewcommand{\figurename}{Abb.}
\listoffigures
\addcontentsline{toc}{section}{\listfigurename}

