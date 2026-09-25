#!/usr/bin/env bash
# Links the app's Apple-free logic files into this package and copies the matching tests with the
# module name rewritten. Re-run after adding files to the lists below.
set -euo pipefail
cd "$(dirname "$0")"
APP=../DoOnce
SOURCES=(
  Sources/DesignSystem/L10n.swift
  Sources/Features/Shared/Formatting.swift
  Sources/Features/Memory/TimelineGrouping.swift
  Sources/Features/Memory/SearchViewModel.swift
  Sources/Features/Do/DoModeViewModel.swift
  Sources/Features/Do/StepCompletionMonitor.swift
  Sources/Services/Speech/MemoryQuestionAnswering.swift
  Sources/Services/Analytics/AnalyticsService.swift
  Sources/Services/AI/ProcessingPipeline.swift
)
TESTS=(
  Tests/DoOnceTests/DoModeViewModelTests.swift
  Tests/DoOnceTests/TranscriptGroundedAnswererTests.swift
  Tests/DoOnceTests/SearchViewModelTests.swift
  Tests/DoOnceTests/TimelineGroupingTests.swift
  Tests/DoOnceTests/PaywallGateTests.swift
  Tests/DoOnceTests/Pipeline/ProcessingPipelineTests.swift
)
find Sources/AppLogic -type l -delete
for f in "${SOURCES[@]}"; do ln -s "../../$APP/$f" "Sources/AppLogic/$(basename "$f")"; done
rm -f Tests/AppLogicTests/*.swift
for f in "${TESTS[@]}"; do sed 's/@testable import DoOnce$/@testable import AppLogic/; s/^import DoOnce$/import AppLogic/' "$APP/$f" > "Tests/AppLogicTests/$(basename "$f")"; done
echo "linked ${#SOURCES[@]} sources, copied ${#TESTS[@]} tests"
