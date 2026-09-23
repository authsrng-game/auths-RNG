#!/usr/bin/env fish

set target (test -n "$argv[1]"; and echo $argv[1]; or echo "assets/scripts")
set report_dir "./analysis/report"
set tools_dir (dirname (status -f))
mkdir -p $report_dir

function run_npx
    npx --yes $argv
end

echo "== static analysis: $target =="

echo "== eslint pass =="
run_npx eslint $target -f json > $report_dir/eslint.json 2>$report_dir/eslint.stderr.log

echo "== tsc pass (tsconfig.json) =="
run_npx tsc --noEmit > $report_dir/tsc.log 2>&1

echo "== tsc checkJs pass on plain JS =="
run_npx tsc --allowJs --checkJs --noEmit --target es2022 --moduleResolution node \
    $target/*.js $target/engine/*.js $target/systems/*.js $target/services/*.js \
    > $report_dir/tsc-checkjs.log 2>&1

if test -f package.json
    echo "== knip pass =="
    run_npx knip --reporter json > $report_dir/knip.json 2>$report_dir/knip.stderr.log
end

set css_files (find $target -name "*.css" -not -path "*archive*")
if test -n "$css_files"
    echo "== stylelint pass =="
    run_npx stylelint "$target/**/*.css" --formatter json > $report_dir/stylelint.json 2>$report_dir/stylelint.stderr.log
end

echo "== leak heuristic pass (cross-file) =="
node $tools_dir/leak-heuristic-check.js $target > $report_dir/leak-heuristic.json 2>$report_dir/leak-heuristic.stderr.log

echo "== method consistency pass =="
node $tools_dir/method-consistency-check.js $target > $report_dir/method-consistency.json 2>&1

echo "== broken link check =="
node $tools_dir/broken-links-check.js . > $report_dir/broken-links.txt 2>&1

echo "== tab-out guard check (cross-tree) =="
node $tools_dir/tab-out-guard-check.js $target > $report_dir/tab-out-guard.json 2>&1

echo "== stale global check =="
node $tools_dir/stale-global-check.js $target > $report_dir/stale-globals.txt 2>&1

echo ""
node $tools_dir/summarize.js $report_dir