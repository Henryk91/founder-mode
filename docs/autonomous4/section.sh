#!/bin/sh
# Plan 4: prints one scenario's section of a bot report ("# <Name>" up to the next "# ").
# Usage: docs/autonomous4/section.sh <report.md> "<section heading without #>"
awk -v h="# $2" '$0 == h {f=1; print; next} /^# / {f=0} f' "$1"
